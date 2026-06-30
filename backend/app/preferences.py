"""Preferencias de personalizacao por usuario (sidebar, accent, icones)."""

from copy import deepcopy

NAV_IDS = (
    "dashboard",
    "lista",
    "backlog",
    "gastos",
    "lixeira",
    "categorias",
    "config",
)

NAV_ICON_KEYS = (
    "grid",
    "cart",
    "bookmark",
    "receipt",
    "trash",
    "tags",
    "settings",
    "wallet",
    "shield",
    "user",
    "plus",
    "clock",
    "key",
    "inbox",
    "archive",
    "eye",
)

NAV_ICON_STYLES = ("default", "bullet", "square", "circle", "arrow", "diamond", "none")

DEFAULT_USER_PREFERENCES = {
    "sidebar_title": "Financeiro",
    "accent_color": "#4fffd6",
    "brand_icon": "wallet",
    "nav_icon_style": "default",
    "nav_order": list(NAV_IDS),
    "nav_icons": {
        "dashboard": "grid",
        "lista": "cart",
        "backlog": "bookmark",
        "gastos": "receipt",
        "lixeira": "trash",
        "categorias": "tags",
        "config": "settings",
    },
}


def normalize_preferences(raw: dict | None) -> dict:
    """Mescla preferencias salvas com defaults e corrige valores invalidos."""
    prefs = deepcopy(DEFAULT_USER_PREFERENCES)
    if not raw or not isinstance(raw, dict):
        return prefs

    title = raw.get("sidebar_title")
    if isinstance(title, str):
        title = title.strip()
        if 1 <= len(title) <= 40:
            prefs["sidebar_title"] = title

    color = raw.get("accent_color")
    if isinstance(color, str) and _is_hex_color(color):
        prefs["accent_color"] = color.lower()

    style = raw.get("nav_icon_style")
    if style in NAV_ICON_STYLES:
        prefs["nav_icon_style"] = style

    brand = raw.get("brand_icon")
    if isinstance(brand, str) and brand in NAV_ICON_KEYS:
        prefs["brand_icon"] = brand

    order = raw.get("nav_order")
    if isinstance(order, list):
        cleaned = [x for x in order if isinstance(x, str) and x in NAV_IDS]
        for nav_id in NAV_IDS:
            if nav_id not in cleaned:
                cleaned.append(nav_id)
        prefs["nav_order"] = cleaned[: len(NAV_IDS)]

    icons = raw.get("nav_icons")
    if isinstance(icons, dict):
        merged = dict(prefs["nav_icons"])
        for nav_id in NAV_IDS:
            icon = icons.get(nav_id)
            if isinstance(icon, str) and icon in NAV_ICON_KEYS:
                merged[nav_id] = icon
        prefs["nav_icons"] = merged

    return prefs


def validate_preferences(data: dict) -> dict:
    """Valida preferencias completas antes de persistir."""
    merged = normalize_preferences(data)

    title = merged.get("sidebar_title", "")
    if not isinstance(title, str) or not (1 <= len(title.strip()) <= 40):
        raise ValueError("Titulo da sidebar invalido (1 a 40 caracteres).")

    color = merged.get("accent_color", "")
    if not _is_hex_color(color):
        raise ValueError("Cor de destaque invalida. Use formato #RRGGBB.")

    if merged.get("nav_icon_style") not in NAV_ICON_STYLES:
        raise ValueError("Estilo de icone invalido.")

    if merged.get("brand_icon") not in NAV_ICON_KEYS:
        raise ValueError("Icone do titulo invalido.")

    order = merged.get("nav_order")
    if not isinstance(order, list) or set(order) != set(NAV_IDS):
        raise ValueError("Ordem da sidebar invalida.")

    icons = merged.get("nav_icons")
    if not isinstance(icons, dict):
        raise ValueError("Icones da sidebar invalidos.")
    for nav_id in NAV_IDS:
        if icons.get(nav_id) not in NAV_ICON_KEYS:
            raise ValueError(f"Icone invalido para {nav_id}.")

    return merged


def _is_hex_color(value: str) -> bool:
    if len(value) != 7 or not value.startswith("#"):
        return False
    try:
        int(value[1:], 16)
        return True
    except ValueError:
        return False
