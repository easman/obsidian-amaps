#!/usr/bin/env python3
"""
Generate test markdown files with Chinese coordinates for Obsidian AMaps plugin testing.

Usage:
    python generate_test_files.py [count]

Arguments:
    count: Number of files to generate (default: 100)
"""

import os
import sys
import random
from pathlib import Path

# Chinese city coordinate ranges
# Format: city_name, (lat_min, lat_max, lon_min, lon_max)
CHINA_CITIES = [
    {"name": "北京", "lat": (39.4, 40.4), "lon": (115.7, 117.4)},
    {"name": "上海", "lat": (30.7, 31.9), "lon": (120.8, 122.2)},
    {"name": "广州", "lat": (22.5, 23.5), "lon": (112.8, 114.0)},
    {"name": "深圳", "lat": (22.4, 22.9), "lon": (113.7, 114.6)},
    {"name": "成都", "lat": (30.1, 31.0), "lon": (103.5, 104.9)},
    {"name": "杭州", "lat": (30.0, 30.6), "lon": (119.5, 120.6)},
    {"name": "武汉", "lat": (30.3, 31.0), "lon": (113.7, 114.8)},
    {"name": "西安", "lat": (33.8, 34.8), "lon": (108.5, 109.5)},
    {"name": "重庆", "lat": (28.5, 30.5), "lon": (105.5, 107.5)},
    {"name": "南京", "lat": (31.8, 32.5), "lon": (118.3, 119.1)},
    {"name": "天津", "lat": (38.5, 39.5), "lon": (116.8, 117.8)},
    {"name": "苏州", "lat": (31.2, 31.5), "lon": (120.5, 121.0)},
    {"name": "郑州", "lat": (34.5, 35.0), "lon": (113.5, 114.0)},
    {"name": "长沙", "lat": (28.0, 28.5), "lon": (112.8, 113.4)},
    {"name": "沈阳", "lat": (41.5, 42.0), "lon": (123.2, 123.6)},
    {"name": "青岛", "lat": (36.0, 36.5), "lon": (120.3, 120.7)},
    {"name": "厦门", "lat": (24.4, 24.6), "lon": (118.0, 118.2)},
    {"name": "昆明", "lat": (24.8, 25.2), "lon": (102.6, 102.9)},
    {"name": "大连", "lat": (38.8, 39.2), "lon": (121.5, 121.8)},
    {"name": "哈尔滨", "lat": (45.6, 46.0), "lon": (126.5, 126.8)},
]

# Chinese place types
CHINA_PLACE_TYPES = [
    "博物馆", "公园", "图书馆", "大学", "医院", "商场",
    "餐厅", "咖啡馆", "地铁站", "景点", "酒店", "体育馆",
    "剧院", "电影院", "寺庙", "古迹", "大厦", "广场"
]

# Chinese adjectives
CHINA_ADJECTIVES = [
    "古老", "现代", "繁华", "宁静", "著名", "热闹",
    "美丽", "宏伟", "传统", "时尚", "中央", "滨江",
    "风景优美", "历史悠久", "人文荟萃", "商业繁华"
]

# Chinese place names
CHINA_PLACE_NAMES = [
    "天安门", "故宫", "长城", "颐和园", "天坛",
    "外滩", "东方明珠", "豫园", "南京路",
    "西湖", "灵隐寺", "千岛湖",
    "兵马俑", "大雁塔", "钟楼",
    "宽窄巷子", "锦里", "大熊猫基地",
    "鼓浪屿", "南普陀寺",
    "黄鹤楼", "东湖",
    "解放碑", "洪崖洞",
    "夫子庙", "中山陵",
    "拙政园", "虎丘",
    "少林寺", "嵩山",
]

# Lucide icons suitable for places
PLACE_ICONS = [
    "map-pin", "landmark", "building", "home", "store",
    "utensils", "coffee", "book-open", "trees", "mountain",
    "castle", "church", "school", "hospital", "train",
    "plane", "ship", "camera", "palette", "music"
]

# Colors suitable for markers
PLACE_COLORS = [
    "#c41e3a",  # Chinese Red
    "#2e5c8a",  # Blue
    "#228b22",  # Forest Green
    "#ff8c00",  # Dark Orange
    "#800080",  # Purple
    "#d2691e",  # Chocolate
    "#008080",  # Teal
    "#dc143c",  # Crimson
    "#4169e1",  # Royal Blue
    "#32cd32",  # Lime Green
]


def generate_random_place_name(city_name: str) -> str:
    """Generate a random place name in Chinese."""
    patterns = [
        lambda: f"{city_name}{random.choice(CHINA_ADJECTIVES)}{random.choice(CHINA_PLACE_TYPES)}",
        lambda: f"{random.choice(CHINA_PLACE_NAMES)}{random.choice(CHINA_PLACE_TYPES)}",
        lambda: f"{random.choice(CHINA_ADJECTIVES)}{random.choice(CHINA_PLACE_NAMES)}",
        lambda: f"{city_name}{random.choice(CHINA_PLACE_NAMES)}",
    ]
    return random.choice(patterns)()


def generate_coordinates(city: dict = None) -> tuple:
    """Generate random coordinates within a Chinese city."""
    if city is None:
        city = random.choice(CHINA_CITIES)

    lat = random.uniform(city["lat"][0], city["lat"][1])
    lon = random.uniform(city["lon"][0], city["lon"][1])

    # Format with appropriate precision
    return f"{lat:.6f}", f"{lon:.6f}"


def generate_place_type() -> str:
    """Generate a random place type in [[Type]] format."""
    return f"[[{random.choice(CHINA_PLACE_TYPES)}]]"


def generate_icon() -> str:
    """Generate a random icon name."""
    return random.choice(PLACE_ICONS)


def generate_color() -> str:
    """Generate a random color."""
    return random.choice(PLACE_COLORS)


def create_markdown_file(directory: Path, filename: str, coordinates: tuple,
                         place_type: str, icon: str, color: str) -> None:
    """Create a markdown file with YAML frontmatter."""
    content = f"""---
category: "[[Places]]"
type: "{place_type}"
coordinates:
  - "{coordinates[0]}"
  - "{coordinates[1]}"
icon: "{icon}"
color: "{color}"
---

# {filename.replace('.md', '')}

这是一个测试地点，用于展示 AMaps 插件的功能。
"""

    filepath = directory / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def generate_test_files(count=100, output_dir="generated_places") -> Path:
    """Generate test markdown files with coordinates."""
    # Create output directory
    script_dir = Path(__file__).parent
    output_path = script_dir / output_dir
    output_path.mkdir(exist_ok=True)

    print(f"Generating {count} test files in {output_path}...")

    # Keep track of generated names to avoid duplicates
    generated_names = set()

    for i in range(count):
        # Select a random city
        city = random.choice(CHINA_CITIES)

        # Generate unique place name
        attempt = 0
        place_name = ""
        while attempt < 100:  # Prevent infinite loop
            place_name = generate_random_place_name(city["name"])
            if place_name not in generated_names:
                generated_names.add(place_name)
                break
            attempt += 1
        else:
            # If we can't find a unique name, append a number
            place_name = f"{generate_random_place_name(city['name'])} {i}"

        # Generate coordinates and type
        coordinates = generate_coordinates(city)
        place_type = generate_place_type()
        icon = generate_icon()
        color = generate_color()

        # Create filename (sanitize for filesystem)
        filename = f"{place_name}.md"
        filename = "".join(c for c in filename if c.isalnum() or c in '._- ')
        filename = filename.replace(' ', '_')

        # Create the file
        create_markdown_file(output_path, filename, coordinates, place_type, icon, color)

        # Print progress for large batches
        if (i + 1) % 100 == 0:
            print(f"  Generated {i + 1} files...")

    print(f"✓ Successfully generated {count} files in {output_path}/")
    return output_path


def main():
    """Main entry point."""
    count = 100  # Default

    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
            if count < 1:
                print("Error: Count must be a positive integer")
                sys.exit(1)
        except ValueError:
            print(f"Error: Invalid count '{sys.argv[1]}'. Must be an integer.")
            sys.exit(1)

    generate_test_files(count)


if __name__ == "__main__":
    main()
