#!/usr/bin/env python3
"""Converte PDFs e EPUBs de "Literatura de consulta" em Markdown limpo.

Uso (na pasta ibo/):  python scripts/pdf-epub-para-md.py
Saída:                ../Literatura de consulta/md-limpos/<slug>.md

PDF: usa pdfplumber (tamanho/fonte por palavra) para detectar títulos, remover
cabeçalhos/rodapés e números de página, reunir parágrafos e corrigir hifenização.
EPUB: lê o OPF/spine e converte o XHTML em seções (h1-h6) e parágrafos.
"""
import html
import os
import re
import subprocess
import sys
import unicodedata
import zipfile
from collections import Counter, defaultdict
from html.parser import HTMLParser

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTE = os.path.join(os.path.dirname(BASE), "Literatura de consulta")
SAIDA = os.path.join(FONTE, "md-limpos")

PONTUACAO_FIM = re.compile(r"[.!?:;]\s*$")
NAO_TITULO = re.compile(r"^(Ibid|Cf|Ver|Veja|Nota|Fonte|Cf\.)\b", re.I)
PAGINA_SO = re.compile(r"^[\divxlcdm]{1,6}$", re.I)
LIDERES = re.compile(r"\.{4,}\s*\d*\s*$")
RUIDO = re.compile(
    r"^(editora fiel|www\.|pabx|cep\b|caixa postal|av\.|rua |páginas?:|formato:|isbn|"
    r"tradução:|traduzido do original|revisão:|diagramação:|capa:|título do original|"
    r"copyright|©|proibida a reprodução|todos os direitos|via:|issuu\.com|leia também|"
    r"arte final|impress|1ª edição|edição:|projeto gráfico|revis|^coorden)",
    re.I,
)


def slug(texto: str) -> str:
    s = unicodedata.normalize("NFD", texto.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80] or "livro"


def normalizar(texto: str) -> str:
    texto = texto.replace("\u00ad", "").replace("\u200b", "")
    texto = re.sub(r"\(cid:\d+\)", " ", texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    return texto.strip()


def normalizar_match(texto: str) -> str:
    s = unicodedata.normalize("NFD", texto.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------

def linhas_da_pagina(pg):
    palavras = pg.extract_words(extra_attrs=["size", "fontname"])
    if not palavras:
        return []
    grupos = defaultdict(list)
    for w in palavras:
        grupos[round(w["top"] / 3.0)].append(w)
    linhas = []
    for chave in sorted(grupos):
        ws = sorted(grupos[chave], key=lambda w: w["x0"])
        texto = " ".join(w["text"] for w in ws)
        por_char = Counter()
        for w in ws:
            por_char[round(w["size"])] += len(w["text"])
        tamanho = por_char.most_common(1)[0][0] if por_char else 0
        fontes = [w["fontname"] for w in ws]
        top = min(w["top"] for w in ws)
        linhas.append(
            {
                "texto": normalizar(texto),
                "tamanho": tamanho,
                "fonte": fontes[0] if fontes else "",
                "bold": any("bold" in f.lower() or ",bold" in f.lower() for f in fontes),
                "top": top,
                "altura_pagina": pg.height,
            }
        )
    return [l for l in linhas if l["texto"]]


def paginas_pdftotext(caminho):
    """Texto por página via pdftotext (melhor qualidade que o pdfplumber)."""
    try:
        res = subprocess.run(
            ["pdftotext", "-layout", caminho, "-"],
            capture_output=True,
            check=True,
        )
    except Exception:
        return None
    texto = res.stdout.decode("utf-8", "replace")
    return [pg.split("\n") for pg in texto.split("\f")]


def alinhar_texto(linhas_pl, linhas_pt):
    """Substitui o texto de cada linha do pdfplumber pela linha equivalente do
    pdftotext (mesma posição de leitura), preservando os metadados de fonte."""
    candidatos = [(normalizar_match(l), normalizar(l)) for l in linhas_pt if l.strip()]
    candidatos = [(a, b) for a, b in candidatos if a]
    for l in linhas_pl:
        palavras = set(normalizar_match(l["texto"]).split())
        if not palavras:
            continue
        melhor, melhor_score = None, 0.0
        for norm, original in candidatos:
            alvo = set(norm.split())
            if not alvo:
                continue
            uniao = len(palavras | alvo)
            score = len(palavras & alvo) / uniao if uniao else 0.0
            if score > melhor_score:
                melhor_score, melhor = score, original
        if melhor is not None and melhor_score >= 0.6:
            l["texto"] = melhor


def corpo_do_documento(paginas):
    contagem = Counter()
    for pg in paginas:
        for l in pg:
            contagem[round(l["tamanho"])] += len(l["texto"])
    if not contagem:
        return 11.0
    return contagem.most_common(1)[0][0]


def remover_repetidos(paginas):
    ocorrencias = Counter()
    for pg in paginas:
        vistos = set()
        for l in pg:
            chave = re.sub(r"\d+", "#", l["texto"].lower())
            if len(chave) <= 60 and chave not in vistos:
                vistos.add(chave)
                ocorrencias[chave] += 1
    total = max(len(paginas), 1)
    suspeitos = {k for k, n in ocorrencias.items() if n >= max(3, total * 0.3)}
    limpas = []
    for pg in paginas:
        nova = []
        for l in pg:
            chave = re.sub(r"\d+", "#", l["texto"].lower())
            if chave in suspeitos and len(l["texto"]) <= 60:
                continue
            if (l["top"] < l["altura_pagina"] * 0.06 or l["top"] > l["altura_pagina"] * 0.94) and PAGINA_SO.match(l["texto"]):
                continue
            nova.append(l)
        limpas.append(nova)
    return limpas


def extrair_pdf(caminho):
    if pdfplumber is None:
        raise RuntimeError("pdfplumber não instalado")
    with pdfplumber.open(caminho) as pdf:
        paginas = [linhas_da_pagina(pg) for pg in pdf.pages]
    paginas_pt = paginas_pdftotext(caminho)
    if paginas_pt:
        for i, pg in enumerate(paginas):
            if i < len(paginas_pt):
                alinhar_texto(pg, paginas_pt[i])
    corpo = corpo_do_documento(paginas)
    linhas = [l for pg in remover_repetidos(paginas) for l in pg]

    # blocos: título ou corpo (letras capitulares isoladas são reunidas ao texto)
    blocos = []
    capitular = ""
    for l in linhas:
        tamanho = l["tamanho"]
        texto = l["texto"]
        if RUIDO.match(texto) or LIDERES.search(texto):
            continue
        if tamanho < corpo * 0.85:
            continue
        if len(texto) == 1 and texto.isalpha() and tamanho > corpo * 1.35:
            capitular = texto
            continue
        if capitular:
            texto = capitular + (texto if texto[:1].islower() else " " + texto)
            capitular = ""
        titulo = False
        nivel = None
        if not PAGINA_SO.match(texto) and len(texto) <= 90 and not NAO_TITULO.match(texto):
            if tamanho >= corpo * 1.35:
                titulo = True
                nivel = 1
            elif tamanho >= corpo * 1.15:
                titulo = True
                nivel = 2
            elif (
                l["bold"]
                and len(texto) <= 60
                and not re.search(r"[,;:]\s*$", texto)
                and not re.search(r"\.\s*\d+\s*$", texto)
                and not re.search(r"[a-zá-ú][,.][a-zá-ú]", texto)
                and "”" not in texto
                and "“" not in texto
            ):
                titulo = True
                nivel = 2
        if titulo and PONTUACAO_FIM.search(texto) and not texto.isupper():
            titulo = False
        if titulo:
            blocos.append({"tipo": "titulo", "nivel": nivel, "texto": texto})
        else:
            blocos.append({"tipo": "texto", "texto": texto, "tamanho": tamanho, "bold": l["bold"], "top": l["top"]})

    # funde títulos consecutivos quebrados em linhas
    fundidos = []
    for b in blocos:
        if (
            fundidos
            and b["tipo"] == "titulo"
            and fundidos[-1]["tipo"] == "titulo"
            and not PONTUACAO_FIM.search(fundidos[-1]["texto"])
            and len(fundidos[-1]["texto"]) + len(b["texto"]) <= 60
        ):
            fundidos[-1]["texto"] = f"{fundidos[-1]['texto']} {b['texto']}".strip()
            fundidos[-1]["nivel"] = min(fundidos[-1]["nivel"], b["nivel"])
        else:
            fundidos.append(b)

    # monta seções
    secoes = []
    atual = None
    paragrafo = []

    def fechar_paragrafo():
        nonlocal paragrafo
        if paragrafo and atual is not None:
            texto = juntar_paragrafo(paragrafo)
            if texto:
                atual["conteudo"].append(texto)
        paragrafo = []

    def fechar_secao():
        fechar_paragrafo()
        if atual and atual["conteudo"]:
            secoes.append(atual)

    for b in fundidos:
        if b["tipo"] == "titulo":
            fechar_secao()
            atual = {"titulo": b["texto"], "nivel": b["nivel"], "conteudo": []}
        else:
            if atual is None:
                atual = {"titulo": "", "nivel": 1, "conteudo": []}
            if paragrafo and (
                PONTUACAO_FIM.search(paragrafo[-1]) or LIDERES.search(paragrafo[-1])
            ):
                fechar_paragrafo()
            paragrafo.append(b["texto"])
    fechar_secao()

    secoes = [s for s in secoes if not LIDERES.search(s["titulo"])]
    secoes = [s for s in secoes if not RUIDO.match(s["titulo"])]
    secoes = [s for s in secoes if sum(len(p) for p in s["conteudo"]) >= 80]
    return secoes


def juntar_paragrafo(linhas):
    texto = ""
    for linha in linhas:
        if not texto:
            texto = linha
            continue
        if texto.endswith("-") and linha[:1].islower():
            texto = texto[:-1] + linha
        else:
            texto += " " + linha
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


# ---------------------------------------------------------------------------
# EPUB
# ---------------------------------------------------------------------------

class ExtrairXHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titulo = None
        self.partes = []  # (tipo, texto)
        self._captura = None
        self._buffer = []
        self._classe = ""
        self._ultimo_nivel = None

    def handle_starttag(self, tag, attrs):
        classe = dict(attrs).get("class", "")
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._captura = f"h{tag[1]}"
            self._buffer = []
        elif tag in ("p", "blockquote", "li"):
            self._captura = "p"
            self._buffer = []
            self._classe = classe

    def handle_endtag(self, tag):
        if self._captura and tag in ("h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote", "li"):
            texto = normalizar("".join(self._buffer))
            if texto:
                tipo = self._captura
                if tipo == "p" and self._ultimo_nivel and "tit" in self._classe.lower():
                    tipo = f"h{self._ultimo_nivel}"
                self.partes.append((tipo, texto))
                self._ultimo_nivel = int(tipo[1]) if tipo.startswith("h") else None
            self._captura = None
            self._buffer = []
            self._classe = ""

    def handle_data(self, data):
        if self._captura:
            self._buffer.append(data)


def ler_zip(caminho):
    with zipfile.ZipFile(caminho) as z:
        nomes = z.namelist()
        container = z.read("META-INF/container.xml").decode("utf-8", "replace")
        m = re.search(r'full-path="([^"]+)"', container)
        opf_path = m.group(1) if m else next(n for n in nomes if n.endswith(".opf"))
        opf = z.read(opf_path).decode("utf-8", "replace")
        base = os.path.dirname(opf_path)

        def ler_entrada(href):
            alvo = os.path.normpath(os.path.join(base, href)).replace("\\", "/")
            return z.read(alvo).decode("utf-8", "replace")

        meta = {
            "titulo": (re.search(r"<dc:title[^>]*>(.*?)</dc:title>", opf, re.S) or [None, ""])[1],
            "autor": (re.search(r"<dc:creator[^>]*>(.*?)</dc:creator>", opf, re.S) or [None, ""])[1],
            "ano": (re.search(r"<dc:date[^>]*>(\d{4})", opf) or [None, ""])[1],
        }
        meta = {k: html.unescape(re.sub(r"<[^>]+>", "", v)).strip() for k, v in meta.items()}

        manifest = dict(re.findall(r'<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"', opf))
        manifest2 = dict(re.findall(r'<item\s+[^>]*href="([^"]+)"[^>]*id="([^"]+)"', opf))
        for href, iid in manifest2.items():
            manifest.setdefault(iid, href)
        spine = re.findall(r'<itemref\s+[^>]*idref="([^"]+)"', opf)

        docs = []
        for iid in spine:
            href = manifest.get(iid)
            if not href or not re.search(r"\.x?html?$", href, re.I):
                continue
            docs.append((href, ler_entrada(href)))
        return meta, docs


def extrair_epub(caminho):
    meta, docs = ler_zip(caminho)
    secoes = []
    atual = None
    for href, conteudo in docs:
        parser = ExtrairXHTML()
        parser.feed(conteudo)
        for tipo, texto in parser.partes:
            if tipo.startswith("h"):
                nivel = int(tipo[1])
                if atual and atual["conteudo"]:
                    secoes.append(atual)
                atual = {"titulo": texto, "nivel": nivel, "conteudo": []}
            else:
                if atual is None:
                    atual = {"titulo": "", "nivel": 1, "conteudo": []}
                atual["conteudo"].append(texto)
    if atual and atual["conteudo"]:
        secoes.append(atual)

    ignorar = re.compile(r"^(capa|folha de rosto|rosto|copyright|ficha|cr[eé]ditos)$", re.I)
    secoes = [s for s in secoes if not ignorar.match(s["titulo"] or "")]
    return meta, secoes


# ---------------------------------------------------------------------------

def gravar_md(nome, secoes):
    linhas = []
    for s in secoes:
        if s["titulo"]:
            prefixo = "#" * min(max(s["nivel"], 1), 3)
            linhas.append(f"{prefixo} {s['titulo']}\n")
        for p in s["conteudo"]:
            linhas.append(p + "\n")
    texto = "\n".join(linhas).strip() + "\n"
    destino = os.path.join(SAIDA, nome)
    with open(destino, "w", encoding="utf-8") as f:
        f.write(texto)
    total = sum(len(p) for s in secoes for p in s["conteudo"])
    print(f"{nome}: {len(secoes)} seções, {total} chars, {os.path.getsize(destino)//1024} KB")
    return secoes


def main():
    os.makedirs(SAIDA, exist_ok=True)
    arquivos = sorted(os.listdir(FONTE))
    for arq in arquivos:
        caminho = os.path.join(FONTE, arq)
        if not os.path.isfile(caminho):
            continue
        nome_base = os.path.splitext(arq)[0]
        if arq.lower().endswith(".pdf"):
            print(f"--- PDF: {arq}")
            secoes = extrair_pdf(caminho)
            gravar_md(slug(nome_base) + ".md", secoes)
        elif arq.lower().endswith(".epub"):
            print(f"--- EPUB: {arq}")
            meta, secoes = extrair_epub(caminho)
            print(f"    meta: {meta}")
            gravar_md(slug(nome_base) + ".md", secoes)


if __name__ == "__main__":
    main()
