from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from shop.models import Category, Product, ProductImage


CATEGORIES = [
    {"name": "Роботи-пилососи", "slug": "roboty-pylosocy"},
    {"name": "Смартфони та планшети", "slug": "smartfony-ta-planshety"},
    {"name": "Розумний дім та датчики", "slug": "rozumnyj-dim-ta-datchyky"},
    {"name": "Дрони та камери", "slug": "drony-ta-kamery"},
    {"name": "Аудіо та аксесуари", "slug": "audio-ta-aksesuary"},
]

PRODUCTS = [
    {
        "name": "Roborock S8 MaxV Ultra",
        "brand": "Roborock",
        "category_slug": "roboty-pylosocy",
        "price": Decimal("42999.00"),
        "stock": 5,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
        "description": "Флагманський робот-пилосос з ШІ-розпізнаванням об'єктів, подвійною турбощіткою та станцією самоочищення.",
        "specs": {
            "Потужність всмоктування": "10 000 Па",
            "Ємність акумулятора": "6400 мАг",
            "Тип навігації": "LiDAR + 3D ToF камера",
            "Ємність пилозбірника": "400 мл",
            "Вологе прибирання": "Так, з вібраційною платформою",
            "Площа прибирання": "до 300 м²",
        },
    },
    {
        "name": "Roborock S7 MaxV",
        "brand": "Roborock",
        "category_slug": "roboty-pylosocy",
        "price": Decimal("28499.00"),
        "stock": 8,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600",
        "description": "Розумний робот-пилосос із камерою ReactiveAI 2.0, вібраційною шваброю та голосовим асистентом.",
        "specs": {
            "Потужність всмоктування": "5100 Па",
            "Ємність акумулятора": "5200 мАг",
            "Тип навігації": "LiDAR + RGB камера",
            "Ємність пилозбірника": "400 мл",
            "Вологе прибирання": "Так, VibraRise",
            "Площа прибирання": "до 250 м²",
        },
    },
    {
        "name": "Roborock Q7 Max+",
        "brand": "Roborock",
        "category_slug": "roboty-pylosocy",
        "price": Decimal("18999.00"),
        "stock": 12,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600",
        "description": "Потужний робот-пилосос середнього сегмента з автоматичним вивантаженням пилу.",
        "specs": {
            "Потужність всмоктування": "4200 Па",
            "Ємність акумулятора": "5200 мАг",
            "Тип навігації": "LiDAR",
            "Ємність пилозбірника": "470 мл",
            "Вологе прибирання": "Так",
            "Площа прибирання": "до 240 м²",
        },
    },
    {
        "name": "Xiaomi Robot Vacuum X20 Max",
        "brand": "Xiaomi",
        "category_slug": "roboty-pylosocy",
        "price": Decimal("22499.00"),
        "stock": 7,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        "description": "Робот-пилосос з інтелектуальним маршрутом, мопом та док-станцією.",
        "specs": {
            "Потужність всмоктування": "8000 Па",
            "Ємність акумулятора": "5200 мАг",
            "Тип навігації": "LDS LiDAR",
            "Ємність пилозбірника": "400 мл",
            "Вологе прибирання": "Так, обертовий моп",
            "Площа прибирання": "до 260 м²",
        },
    },
    {
        "name": "Xiaomi Robot Vacuum E12",
        "brand": "Xiaomi",
        "category_slug": "roboty-pylosocy",
        "price": Decimal("7499.00"),
        "stock": 18,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1575314012280-11f99b8b6e1f?w=600",
        "description": "Бюджетний робот-пилосос з гіроскопною навігацією для невеликих квартир.",
        "specs": {
            "Потужність всмоктування": "4000 Па",
            "Ємність акумулятора": "2600 мАг",
            "Тип навігації": "Гіроскоп",
            "Ємність пилозбірника": "600 мл",
            "Вологе прибирання": "Так",
            "Площа прибирання": "до 100 м²",
        },
    },
    {
        "name": "Roborock Dyad Pro Combo",
        "brand": "Roborock",
        "category_slug": "roboty-pylosocy",
        "price": Decimal("31999.00"),
        "stock": 4,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600",
        "description": "Гібридний бездротовий пилосос та робот 2-в-1 зі станцією самоочищення.",
        "specs": {
            "Потужність всмоктування": "17 000 Па",
            "Ємність акумулятора": "6400 мАг",
            "Тип навігації": "LiDAR (робот) + ручний",
            "Вологе прибирання": "Подвійні ролики",
            "Час роботи": "до 90 хв (ручний)",
        },
    },
    {
        "name": "Samsung Galaxy S24 Ultra",
        "brand": "Samsung",
        "category_slug": "smartfony-ta-planshety",
        "price": Decimal("44999.00"),
        "stock": 6,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600",

        "description": "Флагманський смартфон з вбудованим Galaxy AI, титановим корпусом та S Pen.",
        "specs": {
            "Процесор": "Snapdragon 8 Gen 3 for Galaxy",
            "Екран": "6.8\" Dynamic AMOLED 2X, 120 Гц, 2600 ніт",
            "Основна камера": "200 Мп + 50 Мп + 12 Мп + 10 Мп",
            "Оперативна пам'ять": "12 ГБ",
            "Вбудована пам'ять": "256 ГБ",
            "Акумулятор": "5000 мАг, 45 Вт",
        },
    },
    {
        "name": "Samsung Galaxy S24",
        "brand": "Samsung",
        "category_slug": "smartfony-ta-planshety",
        "price": Decimal("28999.00"),
        "stock": 10,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600",

        "description": "Компактний флагман з Galaxy AI та потрійною камерою.",
        "specs": {
            "Процесор": "Exynos 2400",
            "Екран": "6.2\" Dynamic AMOLED 2X, 120 Гц",
            "Основна камера": "50 Мп + 12 Мп + 10 Мп",
            "Оперативна пам'ять": "8 ГБ",
            "Вбудована пам'ять": "128 ГБ",
            "Акумулятор": "4000 мАг, 25 Вт",
        },
    },
    {
        "name": "Apple iPhone 15 Pro Max",
        "brand": "Apple",
        "category_slug": "smartfony-ta-planshety",
        "price": Decimal("44999.00"),
        "stock": 4,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600",

        "description": "Найпотужніший iPhone з титановим дизайном, Action Button та USB-C.",
        "specs": {
            "Процесор": "A17 Pro",
            "Екран": "6.7\" Super Retina XDR OLED, 120 Гц ProMotion",
            "Основна камера": "48 Мп + 12 Мп + 12 Мп (перископ 5x)",
            "Оперативна пам'ять": "8 ГБ",
            "Вбудована пам'ять": "256 ГБ",
            "Акумулятор": "4441 мАг, 27 Вт",
        },
    },
    {
        "name": "Apple iPhone 15",
        "brand": "Apple",
        "category_slug": "smartfony-ta-planshety",
        "price": Decimal("34999.00"),
        "stock": 9,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600",

        "description": "Смартфон з Dynamic Island, 48 Мп камерою та USB-C зарядкою.",
        "specs": {
            "Процесор": "A16 Bionic",
            "Екран": "6.1\" Super Retina XDR OLED",
            "Основна камера": "48 Мп + 12 Мп",
            "Оперативна пам'ять": "6 ГБ",
            "Вбудована пам'ять": "128 ГБ",
            "Акумулятор": "3877 мАг, 20 Вт",
        },
    },
    {
        "name": "Xiaomi 14 Ultra",
        "brand": "Xiaomi",
        "category_slug": "smartfony-ta-planshety",
        "price": Decimal("39999.00"),
        "stock": 5,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600",

        "description": "Камерофон з оптикою Leica Summilux, Snapdragon 8 Gen 3 та кераміка корпус.",
        "specs": {
            "Процесор": "Snapdragon 8 Gen 3",
            "Екран": "6.73\" LTPO AMOLED, 120 Гц, 3000 ніт",
            "Основна камера": "50 Мп Leica x4 (Summilux)",
            "Оперативна пам'ять": "16 ГБ",
            "Вбудована пам'ять": "512 ГБ",
            "Акумулятор": "5000 мАг, 90 Вт",
        },
    },
    {
        "name": "Xiaomi Pad 6",
        "brand": "Xiaomi",
        "category_slug": "smartfony-ta-planshety",
        "price": Decimal("12999.00"),
        "stock": 14,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600",

        "description": "Продуктивний планшет з 11\" IPS екраном 144 Гц та Snapdragon 870.",
        "specs": {
            "Процесор": "Snapdragon 870",
            "Екран": "11\" IPS LCD, 144 Гц, 2.8K",
            "Оперативна пам'ять": "8 ГБ",
            "Вбудована пам'ять": "256 ГБ",
            "Акумулятор": "8840 мАг, 33 Вт",
            "Вага": "490 г",
        },
    },
    {
        "name": "Apple iPad Air M2",
        "brand": "Apple",
        "category_slug": "smartfony-ta-planshety",
        "price": Decimal("27999.00"),
        "stock": 7,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600",

        "description": "Тонкий планшет на чипі Apple M2 з підтримкою Apple Pencil Pro.",
        "specs": {
            "Процесор": "Apple M2",
            "Екран": "11\" Liquid Retina IPS, P3",
            "Оперативна пам'ять": "8 ГБ",
            "Вбудована пам'ять": "128 ГБ",
            "Акумулятор": "до 10 годин",
            "Підтримка стилуса": "Apple Pencil Pro",
        },
    },
    {
        "name": "Samsung Galaxy Tab S9 FE",
        "brand": "Samsung",
        "category_slug": "smartfony-ta-planshety",
        "price": Decimal("15999.00"),
        "stock": 11,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=600",

        "description": "Доступний планшет з S Pen, IP68 та AKG-динаміками.",
        "specs": {
            "Процесор": "Exynos 1380",
            "Екран": "10.9\" TFT LCD, 90 Гц",
            "Оперативна пам'ять": "6 ГБ",
            "Вбудована пам'ять": "128 ГБ",
            "Акумулятор": "8000 мАг, 15 Вт",
            "Захист": "IP68",
        },
    },
    {
        "name": "Aqara Hub M3",
        "brand": "Aqara",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("4999.00"),
        "stock": 16,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1558002038-1055e2dae1d7?w=600",

        "description": "Центральний хаб розумного дому з підтримкою Zigbee 3.0, Thread та Matter.",
        "specs": {
            "Протоколи": "Zigbee 3.0, Thread, Matter, Bluetooth 5.0, Wi-Fi 6",
            "Кількість пристроїв": "до 128",
            "Вбудована пам'ять": "8 ГБ eMMC",
            "Живлення": "USB-C, 5V/2A",
            "Голосові асистенти": "Apple HomeKit, Alexa, Google Home",
        },
    },
    {
        "name": "Aqara Temperature & Humidity Sensor T2",
        "brand": "Aqara",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("899.00"),
        "stock": 20,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600",

        "description": "Бездротовий датчик температури та вологості з E-Ink дисплеєм.",
        "specs": {
            "Діапазон температури": "-20°C — +60°C",
            "Точність температури": "±0.3°C",
            "Діапазон вологості": "0–100%",
            "Протокол": "Zigbee 3.0",
            "Батарея": "CR2450, до 2 років",
            "Дисплей": "E-Ink, 1.97\"",
        },
    },
    {
        "name": "Aqara Door & Window Sensor P2",
        "brand": "Aqara",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("749.00"),
        "stock": 20,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600",

        "description": "Магнітний датчик відчинення дверей і вікон з підтримкою Matter.",
        "specs": {
            "Протокол": "Thread / Matter",
            "Батарея": "CR1632, до 5 років",
            "Відстань спрацювання": "до 22 мм",
            "Робоча температура": "-10°C — +55°C",
            "Сумісність": "Apple Home, Google Home, Alexa",
        },
    },
    {
        "name": "Aqara Motion & Light Sensor P2",
        "brand": "Aqara",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("1299.00"),
        "stock": 15,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&crop=entropy",

        "description": "Датчик руху та освітленості з зоною виявлення 170°.",
        "specs": {
            "Протокол": "Thread / Matter",
            "Зона виявлення": "170° / 7 м",
            "Датчик освітленості": "Так, 0–83000 лк",
            "Батарея": "CR2450, до 5 років",
            "Робоча температура": "-10°C — +45°C",
        },
    },
    {
        "name": "Google Nest Hub 2nd Gen",
        "brand": "Google",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("4299.00"),
        "stock": 9,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=600",

        "description": "Розумний дисплей з Google Асистентом, Soli-радаром та моніторингом сну.",
        "specs": {
            "Екран": "7\" сенсорний LCD",
            "Динамік": "43.5 мм повнодіапазонний",
            "Процесор": "Amlogic T931",
            "Wi-Fi": "802.11ac (2.4/5 ГГц)",
            "Датчики": "Soli радар (відстеження сну, жести)",
            "Живлення": "Мережеве, 15 Вт",
        },
    },
    {
        "name": "Xiaomi Smart Home Hub 2",
        "brand": "Xiaomi",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("2199.00"),
        "stock": 13,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1558002038-1055e2dae1d7?w=600&q=80",

        "description": "Компактний хаб для розумного дому з підтримкою Zigbee, BLE та Wi-Fi.",
        "specs": {
            "Протоколи": "Zigbee 3.0, Bluetooth 5.0 BLE Mesh, Wi-Fi",
            "Кількість пристроїв": "до 100",
            "Живлення": "USB Type-C, 5V/1A",
            "Динамік": "Вбудований для сповіщень",
            "Екосистема": "Mi Home / Xiaomi Home",
        },
    },
    {
        "name": "Aqara Smart Plug EU",
        "brand": "Aqara",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("999.00"),
        "stock": 20,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80",

        "description": "Розумна розетка з моніторингом енергоспоживання та захистом від перевантаження.",
        "specs": {
            "Максимальне навантаження": "2300 Вт / 10 А",
            "Протокол": "Zigbee 3.0",
            "Моніторинг енергії": "Так, потужність / напруга / струм",
            "Захист": "Від перевантаження та перегріву",
            "Сумісність": "Apple HomeKit, Alexa, Google Home",
        },
    },
    {
        "name": "Samsung SmartThings Station",
        "brand": "Samsung",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("3499.00"),
        "stock": 8,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1593359677879-a4bb92f4834b?w=600",

        "description": "Хаб SmartThings з бездротовою зарядкою Qi та підтримкою Matter/Thread.",
        "specs": {
            "Протоколи": "Thread, Matter, Zigbee, Wi-Fi, BLE",
            "Бездротова зарядка": "Qi, 15 Вт",
            "Живлення": "USB-C, 25 Вт адаптер",
            "Сумісність": "SmartThings, Alexa, Google Home",
        },
    },
    {
        "name": "DJI Mavic 3 Pro",
        "brand": "DJI",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("44999.00"),
        "stock": 3,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600",

        "description": "Професійний дрон з потрійною камерою Hasselblad та часом польоту 43 хвилини.",
        "specs": {
            "Камера": "Hasselblad 4/3\" CMOS 20 Мп + 1/1.3\" 12 Мп + 1/2\" 12 Мп",
            "Відео": "5.1K/50fps, 4K/120fps",
            "Час польоту": "до 43 хвилин",
            "Максимальна швидкість": "75 км/год",
            "Дальність передачі": "до 15 км (O3+)",
            "Вага": "958 г",
        },
    },
    {
        "name": "DJI Mini 4 Pro",
        "brand": "DJI",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("28999.00"),
        "stock": 6,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=600",

        "description": "Компактний дрон до 249 г з 4K HDR камерою та обходом перешкод у всіх напрямках.",
        "specs": {
            "Камера": "1/1.3\" CMOS 48 Мп",
            "Відео": "4K/100fps HDR",
            "Час польоту": "до 34 хвилин",
            "Максимальна швидкість": "57.6 км/год",
            "Дальність передачі": "до 20 км (O4)",
            "Вага": "249 г",
        },
    },
    {
        "name": "DJI Air 3",
        "brand": "DJI",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("34999.00"),
        "stock": 5,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600",

        "description": "Дрон з подвійною камерою (ширококутна + телефото 3x), 46 хвилин польоту.",
        "specs": {
            "Камера": "Подвійна: 1/1.3\" 48 Мп + 1/1.3\" 48 Мп (3x зум)",
            "Відео": "4K/100fps HDR",
            "Час польоту": "до 46 хвилин",
            "Максимальна швидкість": "75 км/год",
            "Дальність передачі": "до 20 км (O4)",
            "Вага": "720 г",
        },
    },
    {
        "name": "Xiaomi Outdoor Camera CW400",
        "brand": "Xiaomi",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("2499.00"),
        "stock": 15,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600",

        "description": "Зовнішня камера відеоспостереження 2.5K з кольоровим нічним баченням та IP66.",
        "specs": {
            "Роздільна здатність": "2.5K (2560x1440)",
            "Кут огляду": "150°",
            "Нічне бачення": "Кольорове, ІЧ до 10 м",
            "Захист": "IP66",
            "Зберігання": "microSD до 256 ГБ / NAS",
            "Живлення": "Мережеве, USB-C",
        },
    },
    {
        "name": "Aqara Camera Hub G3",
        "brand": "Aqara",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("4499.00"),
        "stock": 10,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80",

        "description": "Внутрішня PTZ камера з розпізнаванням жестів, Zigbee-хабом та Apple HomeKit.",
        "specs": {
            "Роздільна здатність": "2K (2304x1296)",
            "Кут огляду": "146° (ширококутний)",
            "PTZ": "340° горизонт / 60° вертикаль",
            "Протокол": "Wi-Fi + Zigbee 3.0 (вбудований хаб)",
            "Зберігання": "microSD до 512 ГБ / NAS",
            "ШІ-функції": "Розпізнавання жестів, осіб, тварин",
        },
    },
    {
        "name": "Samsung Galaxy SmartTag2",
        "brand": "Samsung",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("1199.00"),
        "stock": 20,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600",

        "description": "Bluetooth-трекер з IP67, UWB та мережею SmartThings Find.",
        "specs": {
            "Зв'язок": "Bluetooth 5.3, UWB",
            "Батарея": "CR2032, до 500 днів",
            "Захист": "IP67",
            "Розміри": "45.1 x 13.4 мм",
            "Мережа пошуку": "SmartThings Find (200+ млн пристроїв)",
        },
    },
    {
        "name": "DJI Osmo Action 4",
        "brand": "DJI",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("12999.00"),
        "stock": 8,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600",

        "description": "Екшн-камера з 1/1.3\" сенсором, 4K/120fps та магнітним кріпленням.",
        "specs": {
            "Сенсор": "1/1.3\" CMOS",
            "Відео": "4K/120fps, 155° FOV",
            "Стабілізація": "RockSteady 3.0 + HorizonSteady",
            "Захист": "Водонепроникність до 18 м",
            "Екран": "Передній 1.4\" + задній 2.25\" сенсорний",
            "Батарея": "1770 мАг, до 160 хв",
        },
    },
    {
        "name": "Google Pixel Watch 2",
        "brand": "Google",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("14999.00"),
        "stock": 6,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",

        "description": "Розумний годинник з Fitbit-сенсорами здоров'я, Wear OS та Qualcomm W5+.",
        "specs": {
            "Процесор": "Qualcomm Snapdragon W5+ Gen 1",
            "Екран": "1.2\" AMOLED, 320 ppi",
            "Сенсори": "Пульс, SpO2, ЕКГ, температура шкіри, компас",
            "Захист": "5ATM + IP68",
            "Батарея": "до 24 годин",
            "NFC": "Google Pay",
        },
    },
    {
        "name": "Apple AirPods Pro 2 (USB-C)",
        "brand": "Apple",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("9999.00"),
        "stock": 12,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600",

        "description": "Бездротові навушники з адаптивним ANC, просторовим аудіо та USB-C кейсом.",
        "specs": {
            "Чип": "Apple H2",
            "Шумозаглушення": "Адаптивне ANC",
            "Просторове аудіо": "Так, з відстеженням голови",
            "Захист": "IP54 (навушники + кейс)",
            "Батарея": "до 6 год (навушники), 30 год (з кейсом)",
            "Роз'єм": "USB-C + MagSafe + Qi",
        },
    },
    {
        "name": "Samsung Galaxy Buds3 Pro",
        "brand": "Samsung",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("8499.00"),
        "stock": 10,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600",

        "description": "TWS навушники з 2-смуговим динаміком, Galaxy AI та 360 Audio.",
        "specs": {
            "Динамік": "Двосмуговий: 10.5 мм + 6.1 мм планарний",
            "Шумозаглушення": "Адаптивне ANC",
            "Кодеки": "Samsung Seamless, SSC HiFi, AAC, SBC",
            "Захист": "IP57",
            "Батарея": "до 7 год (навушники), 30 год (з кейсом)",
            "Galaxy AI": "Перекладач у реальному часі",
        },
    },
    {
        "name": "Apple AirPods Max",
        "brand": "Apple",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("21999.00"),
        "stock": 4,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",

        "description": "Повнорозмірні навушники з алюмінієвими чашками, ANC та просторовим аудіо.",
        "specs": {
            "Чип": "Apple H1",
            "Динамік": "40 мм кастомний Apple",
            "Шумозаглушення": "Активне ANC",
            "Просторове аудіо": "Так, з Dolby Atmos",
            "Батарея": "до 20 годин",
            "Вага": "384 г",
        },
    },
    {
        "name": "Xiaomi Buds 5 Pro",
        "brand": "Xiaomi",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("4499.00"),
        "stock": 14,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1593359677879-a4bb92f4834b?w=600&q=80",

        "description": "TWS навушники з 50 дБ ANC, LDAC-кодеком та кераміко-металевим корпусом.",
        "specs": {
            "Динамік": "11 мм + п'єзокерамічний твітер",
            "Шумозаглушення": "Адаптивне ANC до 50 дБ",
            "Кодеки": "LDAC, AAC, SBC, LC3",
            "Захист": "IP55",
            "Батарея": "до 6.5 год (навушники), 38 год (з кейсом)",
            "Роз'єм": "USB-C",
        },
    },
    {
        "name": "Google Pixel Buds Pro 2",
        "brand": "Google",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("7999.00"),
        "stock": 8,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=600",

        "description": "TWS навушники з Tensor A1 чипом, Silent Seal 2.0 та Gemini AI.",
        "specs": {
            "Чип": "Google Tensor A1",
            "Динамік": "11 мм кастомний",
            "Шумозаглушення": "Silent Seal 2.0 ANC",
            "Захист": "IP54",
            "Батарея": "до 8 год (навушники), 30 год (з кейсом)",
            "ШІ-функції": "Gemini Live, Conversation Detection",
        },
    },
    {
        "name": "Apple Watch Series 9",
        "brand": "Apple",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("16999.00"),
        "stock": 7,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600",

        "description": "Розумний годинник з S9 SiP, Double Tap жестом та Ultra Wideband 2.",
        "specs": {
            "Процесор": "Apple S9 SiP",
            "Екран": "LTPO OLED Always-On, 2000 ніт",
            "Сенсори": "Пульс, SpO2, ЕКГ, температура, компас, акселерометр",
            "Захист": "WR50, IP6X, EN13319",
            "Батарея": "до 18 год (36 год Low Power Mode)",
            "NFC": "Apple Pay",
        },
    },
    {
        "name": "Samsung Galaxy Watch6 Classic",
        "brand": "Samsung",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("13999.00"),
        "stock": 6,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",

        "description": "Класичний розумний годинник з поворотним безелем та BioActive сенсорами.",
        "specs": {
            "Процесор": "Exynos W930",
            "Екран": "1.47\" Super AMOLED, 480x480",
            "Сенсори": "BioActive (пульс, ЕКГ, тиск, температура шкіри)",
            "Безель": "Поворотний, нержавіюча сталь",
            "Захист": "5ATM + IP68 + MIL-STD-810H",
            "Батарея": "425 мАг, до 40 годин",
        },
    },
    {
        "name": "Apple MagSafe Charger",
        "brand": "Apple",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("1799.00"),
        "stock": 20,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600",

        "description": "Бездротова зарядка MagSafe 15 Вт з магнітним кріпленням для iPhone.",
        "specs": {
            "Потужність": "15 Вт (MagSafe) / 7.5 Вт (Qi)",
            "Кабель": "USB-C, 1 м",
            "Сумісність": "iPhone 12 і новіші, AirPods Pro 2",
            "Магніти": "Масив NdFeB",
        },
    },
    {
        "name": "Samsung 45W Power Adapter",
        "brand": "Samsung",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("1499.00"),
        "stock": 18,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&crop=center",

        "description": "Компактний мережевий адаптер 45 Вт з USB-C для швидкої зарядки Galaxy пристроїв.",
        "specs": {
            "Потужність": "45 Вт (PD 3.0 PPS)",
            "Роз'єм": "USB-C",
            "Вхід": "100-240 В, 50/60 Гц",
            "Сумісність": "Galaxy S24/S23, Galaxy Tab S9/S8",
            "Вага": "62 г",
        },
    },
    {
        "name": "DJI RC-N2 Remote Controller",
        "brand": "DJI",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("4999.00"),
        "stock": 7,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&q=80",

        "description": "Пульт керування DJI з кріпленням для смартфона та O4 передачею відео.",
        "specs": {
            "Передача відео": "DJI O4, до 20 км",
            "Кріплення": "Для смартфонів до 180 мм",
            "Батарея": "3200 мАг, до 6 годин",
            "Роз'єм": "USB-C",
            "Сумісність": "DJI Air 3, Mini 4 Pro, Avata 2",
        },
    },
    {
        "name": "Aqara Roller Shade Driver E1",
        "brand": "Aqara",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("3499.00"),
        "stock": 10,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1558002038-1055e2dae1d7?w=600&crop=center",

        "description": "Мотор для рулонних штор з підтримкою Zigbee та Apple HomeKit.",
        "specs": {
            "Протокол": "Zigbee 3.0",
            "Крутний момент": "3 Нм",
            "Живлення": "Сонячна панель або USB-C (акумулятор 3.7В 2600 мАг)",
            "Діаметр труби": "25–40 мм",
            "Сумісність": "Apple HomeKit, Alexa, Google Home",
        },
    },
    {
        "name": "Xiaomi Smart Air Purifier 4 Pro",
        "brand": "Xiaomi",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("7999.00"),
        "stock": 9,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&crop=top",

        "description": "Очищувач повітря з HEPA-фільтром H13, OLED-дисплеєм та лазерним PM2.5 сенсором.",
        "specs": {
            "CADR": "500 м³/год",
            "Площа приміщення": "до 60 м²",
            "Фільтр": "HEPA H13 + активоване вугілля",
            "Сенсор": "Лазерний PM2.5",
            "Дисплей": "OLED сенсорний",
            "Рівень шуму": "32.1–64.3 дБ(А)",
        },
    },
    {
        "name": "Google Nest Thermostat",
        "brand": "Google",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("5499.00"),
        "stock": 7,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&crop=center",

        "description": "Розумний термостат з адаптивним навчанням, HVAC-моніторингом та Soli-дисплеєм.",
        "specs": {
            "Екран": "2.4\" дзеркальний QVGA з Soli",
            "Сенсори": "Температура, вологість, наближення, зовнішня освітленість",
            "Протоколи": "Wi-Fi, Bluetooth LE, Thread, Matter",
            "Живлення": "24 В HVAC / USB-C",
            "ШІ": "Адаптивне навчання, Eco Temperature",
        },
    },
    {
        "name": "Aqara Smart Lock U200",
        "brand": "Aqara",
        "category_slug": "rozumnyj-dim-ta-datchyky",
        "price": Decimal("8999.00"),
        "stock": 6,
        "is_featured": True,
        "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&crop=center",

        "description": "Розумний дверний замок з відбитком пальця, NFC, Apple Home Key та Matter.",
        "specs": {
            "Розблокування": "Відбиток пальця, NFC, код, ключ, додаток",
            "Протоколи": "Thread / Matter / Bluetooth 5.0",
            "Живлення": "4x AA батареї, до 12 місяців",
            "Сумісність": "Apple Home Key, Google Home, Alexa",
            "Захист": "IP65, автоблокування",
        },
    },
    {
        "name": "Xiaomi Robot Vacuum S20+",
        "brand": "Xiaomi",
        "category_slug": "roboty-pylosocy",
        "price": Decimal("14999.00"),
        "stock": 10,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1575314012280-11f99b8b6e1f?w=600&q=80",

        "description": "Робот-пилосос з LDS навігацією, станцією самоочищення та керуванням через Mi Home.",
        "specs": {
            "Потужність всмоктування": "6000 Па",
            "Ємність акумулятора": "4000 мАг",
            "Тип навігації": "LDS LiDAR",
            "Ємність пилозбірника": "400 мл",
            "Вологе прибирання": "Так",
            "Площа прибирання": "до 200 м²",
        },
    },
    {
        "name": "DJI Avata 2 Fly More Combo",
        "brand": "DJI",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("32999.00"),
        "stock": 4,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&q=80",

        "description": "FPV-дрон з 4K/60fps камерою, окулярами DJI Goggles 3 та контролером руху.",
        "specs": {
            "Камера": "1/1.3\" CMOS 12 Мп",
            "Відео": "4K/100fps, 155° FOV",
            "Час польоту": "до 23 хвилин",
            "Максимальна швидкість": "108 км/год",
            "Передача відео": "DJI O4, до 13 км",
            "Вага": "377 г",
        },
    },
    {
        "name": "Samsung Galaxy Ring",
        "brand": "Samsung",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("14999.00"),
        "stock": 5,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",

        "description": "Розумний перстень для моніторингу здоров'я зі зносостійкого титану.",
        "specs": {
            "Матеріал": "Титан Grade 5",
            "Сенсори": "Пульс, SpO2, температура шкіри, акселерометр",
            "Захист": "10ATM + IP68",
            "Батарея": "до 7 днів",
            "Вага": "2.3–3.0 г (залежно від розміру)",
            "Сумісність": "Samsung Health, Galaxy Watch",
        },
    },
    {
        "name": "Google Nest Cam Indoor (2nd Gen)",
        "brand": "Google",
        "category_slug": "drony-ta-kamery",
        "price": Decimal("3999.00"),
        "stock": 11,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80",

        "description": "Внутрішня камера відеоспостереження 1080p з розпізнаванням облич та голосовим оповіщенням.",
        "specs": {
            "Роздільна здатність": "1080p HDR",
            "Кут огляду": "135°",
            "Нічне бачення": "ІЧ, до 6 м",
            "Зберігання": "Хмара Google (3 год безкоштовно) / Nest Aware",
            "Живлення": "Мережеве, USB-C",
            "ШІ": "Розпізнавання облич, тварин, транспорту",
        },
    },
    {
        "name": "Roborock S8 Pro Ultra",
        "brand": "Roborock",
        "category_slug": "roboty-pylosocy",
        "price": Decimal("38999.00"),
        "stock": 3,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600&q=80",

        "description": "Преміальний робот-пилосос з DuoRoller щіткою, самомиючою станцією та PreciSense LiDAR.",
        "specs": {
            "Потужність всмоктування": "6000 Па",
            "Ємність акумулятора": "5800 мАг",
            "Тип навігації": "PreciSense LiDAR",
            "Ємність пилозбірника": "400 мл",
            "Вологе прибирання": "VibraRise 2.0, автопідйом",
            "Площа прибирання": "до 300 м²",
        },
    },
    {
        "name": "Apple HomePod mini",
        "brand": "Apple",
        "category_slug": "audio-ta-aksesuary",
        "price": Decimal("4499.00"),
        "stock": 12,
        "is_featured": False,
        "image": "https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=600&q=80",

        "description": "Компактна розумна колонка з Siri, Thread-хабом та об'ємним звучанням 360°.",
        "specs": {
            "Чип": "Apple S5",
            "Динамік": "Повнодіапазонний, 360° аудіо",
            "Протоколи": "Wi-Fi 4, Bluetooth 5.0, Thread, UWB",
            "Голосовий асистент": "Siri",
            "Розумний дім": "HomeKit / Matter хаб",
            "Живлення": "USB-C, 20 Вт",
        },
    },
]


class Command(BaseCommand):
    help = "Наповнення бази даних тестовими товарами SmartBot Shop"

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Clearing old data..."))
        ProductImage.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()

        self.stdout.write(self.style.MIGRATE_HEADING("Creating categories..."))
        categories_map = {}
        for cat_data in CATEGORIES:
            cat = Category.objects.create(
                name=cat_data["name"],
                slug=cat_data["slug"],
            )
            categories_map[cat.slug] = cat
            self.stdout.write(f"  + {cat.name}")

        self.stdout.write(self.style.MIGRATE_HEADING(f"Creating {len(PRODUCTS)} products..."))

        featured_count = 0
        for idx, prod_data in enumerate(PRODUCTS, start=1):
            category = categories_map[prod_data["category_slug"]]
            base_slug = slugify(prod_data["name"], allow_unicode=False)
            if not base_slug:
                base_slug = f"product-{idx}"

            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            product = Product.objects.create(
                name=prod_data["name"],
                slug=slug,
                brand=prod_data["brand"],
                description=prod_data["description"],
                specs=prod_data["specs"],
                price=prod_data["price"],
                stock=prod_data["stock"],
                category=category,
                is_active=True,
                is_featured=prod_data["is_featured"],
                image=prod_data.get("image", ""),
            )

            if prod_data["is_featured"]:
                featured_count += 1

            self.stdout.write(
                f"  [{idx:02d}/50] {product.name} - {product.price} grn"
                f"{' *' if product.is_featured else ''}"
            )

        total = Product.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"\nDone! Created {len(categories_map)} categories and {total} products "
            f"({featured_count} featured)."
        ))
