import html
import json
from django import forms
from django.utils.html import format_html
from django.utils.safestring import mark_safe


SPEC_PRESETS = {
    "Загальне": ["Бренд", "Модель", "Колір", "Країна виробника"],
    "Дисплей": ["Дисплей", "Розмір екрану", "Роздільна здатність", "Частота оновлення", "Яскравість", "Тип матриці"],
    "Процесор": ["Процесор", "Ядра", "Частота", "Техпроцес"],
    "Пам'ять": ["RAM", "ROM", "SSD", "Тип пам'яті"],
    "Камера": ["Основна камера", "Фронтальна камера", "Відео"],
    "Акумулятор": ["Акумулятор", "Час заряджання", "Швидке заряджання"],
    "Зв'язок": ["Wi-Fi", "Bluetooth", "NFC", "5G", "USB"],
    "Датчики": ["Сканер відбитку", "Face ID", "Акселерометр", "Гіроскоп", "GPS"],
    "Корпус": ["Вага", "Товщина", "Матеріал корпусу", "Захист IP"],
}


class SpecsWidget(forms.Widget):
    template_name = None

    def render(self, name, value, attrs=None, renderer=None):
        if isinstance(value, str):
            try:
                data = json.loads(value) if value else {}
            except (json.JSONDecodeError, ValueError):
                data = {}
        elif isinstance(value, dict):
            data = value
        else:
            data = {}

        widget_id = (attrs or {}).get("id", f"id_{name}")
        rows_html = ""
        for key, val in data.items():
            key_esc = html.escape(key, quote=True)
            val_esc = html.escape(str(val), quote=True)
            rows_html += f"""
            <div class="spec-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
                <input type="text" placeholder="Назва" value="{key_esc}"
                    style="flex:1;padding:6px 10px;background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;font-size:13px"
                    class="spec-key">
                <input type="text" placeholder="Значення" value="{val_esc}"
                    style="flex:1.5;padding:6px 10px;background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;font-size:13px"
                    class="spec-val">
                <button type="button" onclick="this.closest('.spec-row').remove(); syncSpecs_{widget_id}()"
                    style="padding:4px 10px;background:#7f1d1d;border:none;border-radius:6px;color:#fca5a5;cursor:pointer;font-size:12px">✕</button>
            </div>"""

        presets_html = ""
        for group, keys in SPEC_PRESETS.items():
            keys_js = json.dumps(keys)
            presets_html += f"""
            <details style="margin-bottom:4px">
                <summary style="cursor:pointer;padding:4px 8px;background:#1f2937;border-radius:6px;font-size:12px;color:#9ca3af;list-style:none;user-select:none">▸ {group}</summary>
                <div style="display:flex;flex-wrap:wrap;gap:4px;padding:6px 0 2px 4px">"""
            for k in keys:
                k_attr = html.escape(json.dumps(k, ensure_ascii=True), quote=True)
                presets_html += f"""<button type="button"
                    onclick="addSpecRow_{widget_id}({k_attr}, '')"
                    style="padding:3px 10px;background:#111827;border:1px solid #374151;border-radius:20px;color:#d1d5db;font-size:11px;cursor:pointer">{k}</button>"""
            presets_html += "</div></details>"

        widget_html = mark_safe(f"""
<div id="specs-editor-{widget_id}" style="background:#111827;border:1px solid #374151;border-radius:10px;padding:16px;max-width:720px">
    <input type="hidden" name="{name}" id="{widget_id}" value="{html.escape(json.dumps(data, ensure_ascii=False), quote=True)}">

    <div style="margin-bottom:12px">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Швидке додавання</p>
        {presets_html}
    </div>

    <div id="spec-rows-{widget_id}" style="margin-bottom:10px">
        {rows_html}
    </div>

    <div style="display:flex;gap:8px">
        <button type="button" onclick="addSpecRow_{widget_id}('', '')"
            style="padding:6px 16px;background:#1d4ed8;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px;font-weight:600">
            + Додати рядок
        </button>
        <button type="button" onclick="clearAllSpecs_{widget_id}()"
            style="padding:6px 12px;background:transparent;border:1px solid #374151;border-radius:6px;color:#6b7280;cursor:pointer;font-size:12px">
            Очистити все
        </button>
        <span id="spec-counter-{widget_id}" style="margin-left:auto;font-size:12px;color:#6b7280;align-self:center"></span>
    </div>
</div>

<script>
(function() {{
    var containerId = "spec-rows-{widget_id}";
    var hiddenId = "{widget_id}";

    function syncSpecs_{widget_id}() {{
        var rows = document.getElementById(containerId).querySelectorAll(".spec-row");
        var obj = {{}};
        rows.forEach(function(row) {{
            var k = row.querySelector(".spec-key").value.trim();
            var v = row.querySelector(".spec-val").value.trim();
            if (k) obj[k] = v;
        }});
        document.getElementById(hiddenId).value = JSON.stringify(obj);
        document.getElementById("spec-counter-{widget_id}").textContent = Object.keys(obj).length + " характеристик";
    }}

    window.syncSpecs_{widget_id} = syncSpecs_{widget_id};

    window.addSpecRow_{widget_id} = function(key, val) {{
        var container = document.getElementById(containerId);
        var row = document.createElement("div");
        row.className = "spec-row";
        row.style.cssText = "display:flex;gap:8px;margin-bottom:6px;align-items:center";
        row.innerHTML = '<input type="text" placeholder="Назва" class="spec-key" style="flex:1;padding:6px 10px;background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;font-size:13px">'
            + '<input type="text" placeholder="Значення" class="spec-val" style="flex:1.5;padding:6px 10px;background:#1f2937;border:1px solid #374151;border-radius:6px;color:#f9fafb;font-size:13px">'
            + '<button type="button" style="padding:4px 10px;background:#7f1d1d;border:none;border-radius:6px;color:#fca5a5;cursor:pointer;font-size:12px">✕</button>';
        row.querySelector(".spec-key").value = key;
        row.querySelector(".spec-val").value = val;
        row.querySelector("button").onclick = function() {{ row.remove(); syncSpecs_{widget_id}(); }};
        row.querySelectorAll("input").forEach(function(inp) {{ inp.addEventListener("input", syncSpecs_{widget_id}); }});
        container.appendChild(row);
        syncSpecs_{widget_id}();
        row.querySelector(".spec-val").focus();
    }};

    window.clearAllSpecs_{widget_id} = function() {{
        document.getElementById(containerId).innerHTML = "";
        syncSpecs_{widget_id}();
    }};

    document.getElementById(containerId).addEventListener("input", syncSpecs_{widget_id});
    syncSpecs_{widget_id}();
}})();
</script>
""")
        return widget_html

    def value_from_datadict(self, data, files, name):
        raw = data.get(name, "{}")
        try:
            parsed = json.loads(raw)
            return json.dumps(parsed, ensure_ascii=False) if parsed else "{}"
        except (json.JSONDecodeError, ValueError):
            return "{}"
