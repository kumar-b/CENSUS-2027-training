#!/usr/bin/env python3
"""
Generate option-7 … 11 from option-6 by swapping color palettes.
Each variant replaces every hex color, gradient, rgba(), and text label.
"""

import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(BASE, 'option-6-playful-terracotta.html')

def apply(src, replacements):
    """Apply a list of (old, new) pairs in order."""
    for old, new in replacements:
        src = src.replace(old, new)
    return src

# ───────────────────────────────────────────────────────────────────
# SOURCE COLORS (option-6 terracotta palette, longest keys first)
# ───────────────────────────────────────────────────────────────────
# Primary   : #C1440E / dark #9A3409 / light #F4956A / pale #FAE0D3
# Secondary : #D4843A / dark #AA6520 / light #F7D8A8
# Success   : #2D6A4F / dark #1B4332
# Gold/XP   : #C9970A
# Backgrounds: #FDF6EE #F5E8D8 #FFFAF4
# Border    : #E8D5C0
# Text      : #2C1810 / sec #7A5C4A / sub #7A3008 / muted #AD8B78
# RGBA      : rgba(193,68,14,0.2/0.4)
# Gradients : body, s1-top (handled via rules above since they use the hex values)

# ───────────────────────────────────────────────────────────────────
# OPTION 7 — Playful Indigo  (Navy blue primary, Cyan secondary)
# ───────────────────────────────────────────────────────────────────
O7 = [
    # rgba first (longer strings)
    ('rgba(193,68,14,0.4)', 'rgba(29,78,216,0.4)'),
    ('rgba(193,68,14,0.2)', 'rgba(29,78,216,0.2)'),
    # hex colors — longest / most specific first
    ('#FAE0D3', '#DBEAFE'),   # primary pale  → blue pale
    ('#F4956A', '#93C5FD'),   # primary light → blue light
    ('#C1440E', '#1D4ED8'),   # primary       → royal blue
    ('#9A3409', '#1E3A8A'),   # primary dark  → navy
    ('#7A3008', '#1E3A8A'),   # streak-sub    → navy
    ('#F7D8A8', '#BAE6FD'),   # secondary pale→ cyan pale
    ('#D4843A', '#0891B2'),   # secondary     → cyan
    ('#AA6520', '#0E7490'),   # secondary dark→ cyan dark
    ('#2D6A4F', '#16A34A'),   # success green → emerald
    ('#1B4332', '#15803D'),   # success dark  → emerald dark
    ('#FDF6EE', '#EFF6FF'),   # bg cream      → blue-white
    ('#F5E8D8', '#DBEAFE'),   # surface       → light blue
    ('#FFFAF4', '#FAFEFF'),   # card          → near-white
    ('#E8D5C0', '#BFDBFE'),   # border        → blue border
    ('#2C1810', '#1E3A5F'),   # text          → dark navy
    ('#7A5C4A', '#3B5A8F'),   # text-sec      → blue-navy
    ('#AD8B78', '#6B8CC0'),   # text-muted    → muted blue
    ('#C9970A', '#D97706'),   # gold XP       → amber (close)
    # body gradient
    ('#F5E8D8 0%, #FDF6EE 50%, #F7D8A8 100%',
     '#DBEAFE 0%, #EFF6FF 50%, #BAE6FD 100%'),
    # s1-top gradient
    ('#FAE0D3 0%, #FDF6EE 100%',
     '#DBEAFE 0%, #EFF6FF 100%'),
    # meta / label text
    ('Census 2027 \u2014 Playful Terracotta Design Mockup',
     'Census 2027 \u2014 Playful Indigo Design Mockup'),
    ('Option 6 \u2014 Playful Terracotta',
     'Option 7 \u2014 Playful Indigo'),
    ('Gamified layout \u00b7 Warm earthy palette \u00b7 Census 2027 Training',
     'Gamified layout \u00b7 Ocean blue palette \u00b7 Census 2027 Training'),
    ('Terracotta Primary', 'Indigo Primary'),
    ('Ochre Warmth',       'Cyan Secondary'),
    ('Forest Success',     'Emerald Accent'),
    ('Gold XP',            'Amber XP'),
]

# ───────────────────────────────────────────────────────────────────
# OPTION 8 — Playful Saffron  (Saffron/orange primary, Green secondary)
# ───────────────────────────────────────────────────────────────────
O8 = [
    ('rgba(193,68,14,0.4)', 'rgba(234,88,12,0.4)'),
    ('rgba(193,68,14,0.2)', 'rgba(234,88,12,0.2)'),
    ('#FAE0D3', '#FFEDD5'),
    ('#F4956A', '#FB923C'),
    ('#C1440E', '#EA580C'),   # saffron orange
    ('#9A3409', '#C2410C'),   # saffron dark
    ('#7A3008', '#9A3412'),
    ('#F7D8A8', '#D1FAE5'),
    ('#D4843A', '#16A34A'),   # secondary → emerald green
    ('#AA6520', '#15803D'),
    ('#2D6A4F', '#7C3AED'),   # accent → violet
    ('#1B4332', '#6D28D9'),
    ('#FDF6EE', '#FFF7ED'),   # ivory bg
    ('#F5E8D8', '#FFEDD5'),
    ('#FFFAF4', '#FFFDF8'),
    ('#E8D5C0', '#FED7AA'),
    ('#2C1810', '#431407'),
    ('#7A5C4A', '#9A3412'),
    ('#AD8B78', '#C4845B'),
    ('#C9970A', '#D97706'),
    ('#F5E8D8 0%, #FDF6EE 50%, #F7D8A8 100%',
     '#FFEDD5 0%, #FFF7ED 50%, #D1FAE5 100%'),
    ('#FAE0D3 0%, #FDF6EE 100%',
     '#FFEDD5 0%, #FFF7ED 100%'),
    ('Census 2027 \u2014 Playful Terracotta Design Mockup',
     'Census 2027 \u2014 Playful Saffron Design Mockup'),
    ('Option 6 \u2014 Playful Terracotta',
     'Option 8 \u2014 Playful Saffron'),
    ('Gamified layout \u00b7 Warm earthy palette \u00b7 Census 2027 Training',
     'Gamified layout \u00b7 Saffron & green palette \u00b7 Census 2027 Training'),
    ('Terracotta Primary', 'Saffron Primary'),
    ('Ochre Warmth',       'Emerald Secondary'),
    ('Forest Success',     'Violet Accent'),
    ('Gold XP',            'Amber XP'),
]

# ───────────────────────────────────────────────────────────────────
# OPTION 9 — Playful Emerald  (Forest green primary, Amber secondary)
# ───────────────────────────────────────────────────────────────────
O9 = [
    ('rgba(193,68,14,0.4)', 'rgba(5,150,105,0.4)'),
    ('rgba(193,68,14,0.2)', 'rgba(5,150,105,0.2)'),
    ('#FAE0D3', '#D1FAE5'),
    ('#F4956A', '#6EE7B7'),
    ('#C1440E', '#059669'),   # emerald primary
    ('#9A3409', '#047857'),   # emerald dark
    ('#7A3008', '#064E3B'),
    ('#F7D8A8', '#FDE68A'),
    ('#D4843A', '#D97706'),   # secondary → amber
    ('#AA6520', '#B45309'),
    ('#2D6A4F', '#7C3AED'),   # accent → violet
    ('#1B4332', '#6D28D9'),
    ('#FDF6EE', '#ECFDF5'),   # light green bg
    ('#F5E8D8', '#D1FAE5'),
    ('#FFFAF4', '#F0FDF9'),
    ('#E8D5C0', '#A7F3D0'),
    ('#2C1810', '#064E3B'),
    ('#7A5C4A', '#065F46'),
    ('#AD8B78', '#10B981'),
    ('#C9970A', '#D97706'),
    ('#F5E8D8 0%, #FDF6EE 50%, #F7D8A8 100%',
     '#D1FAE5 0%, #ECFDF5 50%, #FDE68A 100%'),
    ('#FAE0D3 0%, #FDF6EE 100%',
     '#D1FAE5 0%, #ECFDF5 100%'),
    ('Census 2027 \u2014 Playful Terracotta Design Mockup',
     'Census 2027 \u2014 Playful Emerald Design Mockup'),
    ('Option 6 \u2014 Playful Terracotta',
     'Option 9 \u2014 Playful Emerald'),
    ('Gamified layout \u00b7 Warm earthy palette \u00b7 Census 2027 Training',
     'Gamified layout \u00b7 Forest emerald palette \u00b7 Census 2027 Training'),
    ('Terracotta Primary', 'Emerald Primary'),
    ('Ochre Warmth',       'Amber Secondary'),
    ('Forest Success',     'Violet Accent'),
    ('Gold XP',            'Amber XP'),
]

# ───────────────────────────────────────────────────────────────────
# OPTION 10 — Corporate Slate  (Charcoal slate primary, Steel teal secondary)
# Clean, formal palette suited to government / institutional use.
# Primary   : #1E293B / dark #0F172A / light #64748B / pale #F1F5F9
# Secondary : #0F766E / dark #0D5E57 / pale #CCFBF1
# Success   : #0369A1  Backgrounds: #F8FAFC #F1F5F9 #FFFFFF  Border: #CBD5E1
# Text      : #0F172A / sec #475569 / sub #334155 / muted #94A3B8
# ───────────────────────────────────────────────────────────────────
O10 = [
    # rgba first
    ('rgba(193,68,14,0.4)', 'rgba(30,41,59,0.4)'),
    ('rgba(193,68,14,0.2)', 'rgba(30,41,59,0.2)'),
    # hex — longest / most specific first
    ('#FAE0D3', '#F1F5F9'),   # primary pale  → slate pale
    ('#F4956A', '#94A3B8'),   # primary light → slate-400
    ('#C1440E', '#1E293B'),   # primary       → charcoal slate
    ('#9A3409', '#0F172A'),   # primary dark  → slate-900
    ('#7A3008', '#0F172A'),   # streak-sub    → slate-900
    ('#F7D8A8', '#CCFBF1'),   # secondary pale→ teal pale
    ('#D4843A', '#0F766E'),   # secondary     → steel teal
    ('#AA6520', '#0D5E57'),   # secondary dark→ teal dark
    ('#2D6A4F', '#0369A1'),   # success       → corporate blue
    ('#1B4332', '#075985'),   # success dark  → corporate blue dark
    ('#FDF6EE', '#F8FAFC'),   # bg cream      → near-white
    ('#F5E8D8', '#F1F5F9'),   # surface       → slate-100
    ('#FFFAF4', '#FFFFFF'),   # card          → white
    ('#E8D5C0', '#CBD5E1'),   # border        → slate-300
    ('#2C1810', '#0F172A'),   # text          → slate-900
    ('#7A5C4A', '#475569'),   # text-sec      → slate-600
    ('#AD8B78', '#94A3B8'),   # text-muted    → slate-400
    ('#C9970A', '#B45309'),   # gold XP       → amber-700
    # gradients
    ('#F5E8D8 0%, #FDF6EE 50%, #F7D8A8 100%',
     '#F1F5F9 0%, #F8FAFC 50%, #CCFBF1 100%'),
    ('#FAE0D3 0%, #FDF6EE 100%',
     '#F1F5F9 0%, #F8FAFC 100%'),
    # labels
    ('Census 2027 \u2014 Playful Terracotta Design Mockup',
     'Census 2027 \u2014 Corporate Slate Design Mockup'),
    ('Option 6 \u2014 Playful Terracotta',
     'Option 10 \u2014 Corporate Slate'),
    ('Gamified layout \u00b7 Warm earthy palette \u00b7 Census 2027 Training',
     'Professional layout \u00b7 Slate & teal palette \u00b7 Census 2027 Training'),
    ('Terracotta Primary', 'Slate Primary'),
    ('Ochre Warmth',       'Steel Teal'),
    ('Forest Success',     'Corporate Blue'),
    ('Gold XP',            'Amber XP'),
]

# ───────────────────────────────────────────────────────────────────
# OPTION 11 — Midnight Navy + Gold  (Deep navy primary, Warm gold secondary)
# Premium, authoritative palette — formal yet refined.
# Primary   : #172554 / dark #0C1844 / light #3B82F6 / pale #EFF6FF
# Secondary : #B45309 / dark #92400E / pale #FEF3C7
# Success   : #15803D  Backgrounds: #F9FAFB #EFF6FF #FFFFFF  Border: #BFDBFE
# Text      : #0C1844 / sec #1E40AF / sub #1E3A8A / muted #60A5FA
# ───────────────────────────────────────────────────────────────────
O11 = [
    # rgba first
    ('rgba(193,68,14,0.4)', 'rgba(23,37,84,0.4)'),
    ('rgba(193,68,14,0.2)', 'rgba(23,37,84,0.2)'),
    # hex — longest / most specific first
    ('#FAE0D3', '#EFF6FF'),   # primary pale  → navy pale
    ('#F4956A', '#93C5FD'),   # primary light → blue-300
    ('#C1440E', '#172554'),   # primary       → midnight navy
    ('#9A3409', '#0C1844'),   # primary dark  → deepest navy
    ('#7A3008', '#1E3A8A'),   # streak-sub    → navy-800
    ('#F7D8A8', '#FEF3C7'),   # secondary pale→ gold pale
    ('#D4843A', '#B45309'),   # secondary     → warm gold
    ('#AA6520', '#92400E'),   # secondary dark→ gold dark
    ('#2D6A4F', '#15803D'),   # success       → forest green
    ('#1B4332', '#166534'),   # success dark  → green dark
    ('#FDF6EE', '#F9FAFB'),   # bg cream      → cool white
    ('#F5E8D8', '#EFF6FF'),   # surface       → blue-50
    ('#FFFAF4', '#FFFFFF'),   # card          → white
    ('#E8D5C0', '#BFDBFE'),   # border        → blue-200
    ('#2C1810', '#0C1844'),   # text          → midnight navy
    ('#7A5C4A', '#1E40AF'),   # text-sec      → blue-800
    ('#AD8B78', '#60A5FA'),   # text-muted    → blue-400
    ('#C9970A', '#D97706'),   # gold XP       → amber
    # gradients
    ('#F5E8D8 0%, #FDF6EE 50%, #F7D8A8 100%',
     '#EFF6FF 0%, #F9FAFB 50%, #FEF3C7 100%'),
    ('#FAE0D3 0%, #FDF6EE 100%',
     '#EFF6FF 0%, #F9FAFB 100%'),
    # labels
    ('Census 2027 \u2014 Playful Terracotta Design Mockup',
     'Census 2027 \u2014 Midnight Navy Design Mockup'),
    ('Option 6 \u2014 Playful Terracotta',
     'Option 11 \u2014 Midnight Navy'),
    ('Gamified layout \u00b7 Warm earthy palette \u00b7 Census 2027 Training',
     'Professional layout \u00b7 Navy & gold palette \u00b7 Census 2027 Training'),
    ('Terracotta Primary', 'Navy Primary'),
    ('Ochre Warmth',       'Gold Accent'),
    ('Forest Success',     'Green Success'),
    ('Gold XP',            'Gold XP'),
]

VARIANTS = [
    ('option-7-playful-indigo.html',    O7),
    ('option-8-playful-saffron.html',   O8),
    ('option-9-playful-emerald.html',   O9),
    ('option-10-corporate-slate.html',  O10),
    ('option-11-midnight-navy.html',    O11),
]

with open(SRC, 'r', encoding='utf-8') as f:
    source = f.read()

for fname, rules in VARIANTS:
    out_path = os.path.join(BASE, fname)
    result = apply(source, rules)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(result)
    size_kb = len(result) / 1024
    print(f'  {fname}  ({size_kb:.1f} KB)')

print('Done.')
