#!/usr/bin/env python3
"""Gera as fixtures de paridade usando as MESMAS libs do backend Python.

Rode dentro do venv do backend atual, com o segredo real:

    JWT_SECRET="<o mesmo do .env da raiz>" python backend/scripts/gen-fixtures.py

Saida: backend/test/fixtures/{python-hashes,python-tokens}.json

Os tokens sao gerados com `exp` ABSOLUTO (agora + 120 min). Nao verifique esses
tokens contra o relogio real: o `jwt-parity.test.ts` fixa o relogio em
`clockTimestamp`, derivado do proprio `exp` da fixture. Regerar as fixtures nao
e necessario so porque o tempo passou.
"""
import datetime
import json
import os
import pathlib

import bcrypt
from jose import jwt

OUT = pathlib.Path(__file__).resolve().parents[1] / "test" / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)


def to_bytes(p: str) -> bytes:
    """Replica security._to_bytes do backend atual."""
    return p.encode("utf-8")[:72]


cases = {
    "simples": "Admin@123",
    "acentos": "Senh@Ácida2026",
    "emoji": "P@ssw0rd\U0001F600xyz",
    "limite_71": "A@" + "a" * 69,
    "limite_72": "A@" + "a" * 70,
    "limite_73": "A@" + "a" * 71,
    # o corte em 72 bytes cai NO MEIO de um caractere multibyte
    "corte_multibyte": "A" + "á" * 36,
}

hashes = {
    k: {"pw": v, "hash": bcrypt.hashpw(to_bytes(v), bcrypt.gensalt()).decode()}
    for k, v in cases.items()
}
(OUT / "python-hashes.json").write_text(
    json.dumps(hashes, ensure_ascii=False, indent=2), encoding="utf-8"
)

SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
now = datetime.datetime.utcnow()
tokens = {
    "secret": SECRET,
    "valido": {
        "sub": "1",
        "token": jwt.encode(
            {"sub": "1", "exp": now + datetime.timedelta(minutes=120)},
            SECRET,
            algorithm="HS256",
        ),
    },
    "expirado": {
        "sub": "1",
        "token": jwt.encode(
            {"sub": "1", "exp": now - datetime.timedelta(minutes=1)},
            SECRET,
            algorithm="HS256",
        ),
    },
}
(OUT / "python-tokens.json").write_text(
    json.dumps(tokens, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("fixtures geradas em", OUT)
