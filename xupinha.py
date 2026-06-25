#!/usr/bin/env python3
"""
Parse theorie24.de German driving theory test questions and create an Anki deck.
- Reads German base data for question structure (points, images, categories, etc.)
- Reads English (GB) extension data for translated text
- Decodes ROT13 encoded text
- Downloads question images
- Creates an Anki .apkg deck organized by topic
"""

import re
import codecs
import json
import os
import hashlib
import time
import urllib.request
import concurrent.futures
from collections import defaultdict

import genanki

# ─── Configuration ──────────────────────────────────────────────────────────
BASE_URL = "https://t24.theorie24.de/2025-01-v400"
IMAGE_BASE_URL = f"{BASE_URL}/data/img/images"
DOWNLOAD_DIR = "/home/z/my-project/download"
IMAGE_DIR = os.path.join(DOWNLOAD_DIR, "question_images")
OUTPUT_APKG = os.path.join(DOWNLOAD_DIR, "German_Driving_Theory_Test.apkg")

# Chapter name mapping (English)
CHAPTER_NAMES = {
    "1.1": "Basic Knowledge - Danger Theory",
    "1.2": "Basic Knowledge - Behaviour in Road Traffic",
    "1.3": "Basic Knowledge - Right of Way, Priority",
    "1.4": "Basic Knowledge - Traffic Signs",
    "1.5": "Basic Knowledge - Environmental Protection",
    "1.7": "Basic Knowledge - Rules of Thumb",
    "1.8": "Basic Knowledge - Qualification and Ability of Drivers",
    "2.1": "Class B - Danger Theory",
    "2.2": "Class B - Behaviour in Road Traffic",
    "2.4": "Class B - Traffic Signs",
    "2.5": "Class B - Environmental Protection",
    "2.6": "Class B - Rules concerning the Operation of Vehicles",
    "2.7": "Class B - Technology",
    "2.8": "Class B - Qualification and Ability of Drivers",
}

# Top-level grouping
TOP_LEVEL = {
    "1": "Basic Knowledge",
    "2": "Class B (Additive)",
}

# ─── Step 1: Parse German base data ─────────────────────────────────────────
print("Step 1: Parsing German base question data...")

with open(os.path.join(DOWNLOAD_DIR, "tblQuestions_de.js"), "r", encoding="utf-8") as f:
    content_de = f.read()

# Extract question entries
# Pattern: dbTblQ[idx] = { ... };
raw_questions = re.findall(r'dbTblQ\[(\d+)\]\s*=\s*(\{[^}]+\})', content_de)

questions = {}
for idx_str, qdata_str in raw_questions:
    idx = int(idx_str)
    # Parse the JSON-like structure
    # We need to be careful with the string values
    try:
        # Convert to proper JSON by replacing unquoted keys
        # Actually, let's use regex to extract fields
        q = {}
        
        q['number'] = re.search(r'"number"\s*:\s*"([^"]*)"', qdata_str).group(1) if re.search(r'"number"\s*:\s*"([^"]*)"', qdata_str) else ""
        q['picture'] = re.search(r'"picture"\s*:\s*"([^"]*)"', qdata_str).group(1) if re.search(r'"picture"\s*:\s*"([^"]*)"', qdata_str) else ""
        q['stvo'] = re.search(r'"stvo"\s*:\s*"([^"]*)"', qdata_str).group(1) if re.search(r'"stvo"\s*:\s*"([^"]*)"', qdata_str) else ""
        q['points'] = int(re.search(r'"points"\s*:\s*(\d+)', qdata_str).group(1)) if re.search(r'"points"\s*:\s*(\d+)', qdata_str) else 0
        q['basic'] = int(re.search(r'"basic"\s*:\s*(\d+)', qdata_str).group(1)) if re.search(r'"basic"\s*:\s*(\d+)', qdata_str) else 0
        q['basic_mofa'] = int(re.search(r'"basic_mofa"\s*:\s*(\d+)', qdata_str).group(1)) if re.search(r'"basic_mofa"\s*:\s*(\d+)', qdata_str) else 0
        q['category_id'] = re.search(r'"category_id"\s*:\s*"([^"]*)"', qdata_str).group(1) if re.search(r'"category_id"\s*:\s*"([^"]*)"', qdata_str) else ""
        q['mq_flag'] = int(re.search(r'"mq_flag"\s*:\s*(\d+)', qdata_str).group(1)) if re.search(r'"mq_flag"\s*:\s*(\d+)', qdata_str) else 0
        
        # Text (ROT13 encoded)
        text_match = re.search(r'"text"\s*:\s*"((?:[^"\\]|\\.)*)"', qdata_str)
        q['text'] = text_match.group(1) if text_match else ""
        
        # Pretext
        pretext_match = re.search(r'"asw_pretext"\s*:\s*"((?:[^"\\]|\\.)*)"', qdata_str)
        q['asw_pretext'] = pretext_match.group(1) if pretext_match else ""
        
        # Answers (up to 4)
        for i in range(1, 5):
            asw_match = re.search(rf'"asw_{i}"\s*:\s*"((?:[^"\\]|\\.)*)"', qdata_str)
            type_match = re.search(rf'"asw_type_{i}"\s*:\s*"([^"]*)"', qdata_str)
            corr_match = re.search(rf'"asw_corr{i}"\s*:\s*(\d+)', qdata_str)
            
            if asw_match and asw_match.group(1):
                q[f'asw_{i}'] = asw_match.group(1)
                q[f'asw_type_{i}'] = type_match.group(1) if type_match else "0"
                q[f'asw_corr{i}'] = int(corr_match.group(1)) if corr_match else 0
            else:
                break
        
        # Decode ROT13 for text fields
        q['text_de'] = codecs.decode(q['text'], 'rot_13')
        q['asw_pretext_de'] = codecs.decode(q['asw_pretext'], 'rot_13') if q['asw_pretext'] else ""
        
        # Decode answer texts (they are in plain German, not ROT13)
        # Actually some answers are ROT13, some are not. Let's check.
        # The German answers like "Nicht auf dem eigenen Recht bestehen" are plain text
        # So we don't decode them with ROT13
        
        # Determine chapter from number
        parts = q['number'].split('.')
        if len(parts) >= 2:
            chapter = f"{parts[0]}.{parts[1]}"
        else:
            chapter = "unknown"
        q['chapter'] = chapter
        
        questions[idx] = q
    except Exception as e:
        print(f"  Warning: Could not parse question {idx}: {e}")
        continue

print(f"  Parsed {len(questions)} questions from German base data")

# ─── Step 2: Apply English (GB) translations ───────────────────────────────
print("Step 2: Applying English (GB) translations...")

with open(os.path.join(DOWNLOAD_DIR, "tblQuestions_gb.js"), "r", encoding="utf-8") as f:
    content_gb = f.read()

# Pattern: dbTblQ[idx].field = "value";
english_overrides = re.findall(r'dbTblQ\[(\d+)\]\.(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"', content_gb)

english_data = defaultdict(dict)
for idx_str, field, value in english_overrides:
    idx = int(idx_str)
    english_data[idx][field] = value

# Apply English translations to questions
for idx, overrides in english_data.items():
    if idx in questions:
        q = questions[idx]
        for field, value in overrides.items():
            if field == 'text':
                # Decode ROT13 for English text
                q['text_en'] = codecs.decode(value, 'rot_13')
            elif field == 'asw_pretext':
                q['asw_pretext_en'] = codecs.decode(value, 'rot_13') if value else ""
            elif field.startswith('asw_') and not field.startswith('asw_type_') and not field.startswith('asw_corr'):
                # These are answer texts in English (plain text, not ROT13)
                q[f'{field}_en'] = value
            else:
                q[field] = value

# Set defaults for questions without English translation
for idx, q in questions.items():
    if 'text_en' not in q:
        q['text_en'] = q.get('text_de', '')
    if 'asw_pretext_en' not in q:
        q['asw_pretext_en'] = q.get('asw_pretext_de', '')

print(f"  Applied English translations for {len(english_data)} questions")

# ─── Step 3: Build topic hierarchy ──────────────────────────────────────────
print("Step 3: Building topic hierarchy...")

topic_questions = defaultdict(list)
for idx, q in questions.items():
    chapter = q.get('chapter', 'unknown')
    topic_name = CHAPTER_NAMES.get(chapter, f"Unknown ({chapter})")
    topic_questions[topic_name].append(idx)

for topic, qids in sorted(topic_questions.items()):
    print(f"  {topic}: {len(qids)} questions")

# ─── Step 4: Download images ────────────────────────────────────────────────
print("Step 4: Downloading question images...")

os.makedirs(IMAGE_DIR, exist_ok=True)

# Collect unique image filenames
image_files = set()
for idx, q in questions.items():
    pic = q.get('picture', '')
    if pic:
        image_files.add(pic)

print(f"  Found {len(image_files)} unique images to download")


def download_image(filename):
    """Download a single image file."""
    local_path = os.path.join(IMAGE_DIR, filename)
    if os.path.exists(local_path):
        return filename, True, "already exists"
    
    url = f"{IMAGE_BASE_URL}/{filename}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(local_path, 'wb') as f:
                f.write(response.read())
        return filename, True, "downloaded"
    except Exception as e:
        return filename, False, str(e)


# Download images in parallel
downloaded = 0
failed = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    futures = {executor.submit(download_image, img): img for img in sorted(image_files)}
    for future in concurrent.futures.as_completed(futures):
        filename, success, msg = future.result()
        if success:
            downloaded += 1
        else:
            failed += 1
            print(f"  Failed to download {filename}: {msg}")

print(f"  Downloaded: {downloaded}, Failed: {failed}")

# ─── Step 5: Create Anki deck ───────────────────────────────────────────────
print("Step 5: Creating Anki deck...")

# Anki model for the question cards
MODEL_ID = 1607392319  # Fixed ID for the model
DECK_ID = 1357246880   # Fixed ID for the deck

# Create the model with CSS for nice formatting
model = genanki.Model(
    MODEL_ID,
    'German Driving Theory Question',
    fields=[
        {'name': 'QuestionNumber'},
        {'name': 'Chapter'},
        {'name': 'PreText'},
        {'name': 'Question'},
        {'name': 'Image'},
        {'name': 'Answer1'},
        {'name': 'Answer2'},
        {'name': 'Answer3'},
        {'name': 'Answer4'},
        {'name': 'CorrectAnswers'},
        {'name': 'Points'},
        {'name': 'Explanation'},
    ],
    templates=[
        {
            'name': 'Question Card',
            'qfmt': '''<div class="qheader">
  <span class="qnumber">{{QuestionNumber}}</span>
  <span class="qchapter">{{Chapter}}</span>
  <span class="qpoints">{{Points}} point{{Points:s}}</span>
</div>
{{#PreText}}<div class="pretext">{{PreText}}</div>{{/PreText}}
<div class="question">{{Question}}</div>
{{#Image}}<div class="qimage">{{Image}}</div>{{/Image}}
<div class="answers">
  <div class="showhint">Show answer</div>
</div>''',
            'afmt': '''<div class="qheader">
  <span class="qnumber">{{QuestionNumber}}</span>
  <span class="qchapter">{{Chapter}}</span>
  <span class="qpoints">{{Points}} point{{Points:s}}</span>
</div>
{{#PreText}}<div class="pretext">{{PreText}}</div>{{/PreText}}
<div class="question">{{Question}}</div>
{{#Image}}<div class="qimage">{{Image}}</div>{{/Image}}
<div class="answers">
  {{#Answer1}}<div class="answer">{{Answer1}}</div>{{/Answer1}}
  {{#Answer2}}<div class="answer">{{Answer2}}</div>{{/Answer2}}
  {{#Answer3}}<div class="answer">{{Answer3}}</div>{{/Answer3}}
  {{#Answer4}}<div class="answer">{{Answer4}}</div>{{/Answer4}}
</div>
<div class="correct">{{CorrectAnswers}}</div>
{{#Explanation}}<hr><div class="explanation">{{Explanation}}</div>{{/Explanation}}''',
        },
    ],
    css='''\
.card {
  font-family: Arial, sans-serif;
  background: #f8f9fa;
  padding: 16px;
  max-width: 700px;
  margin: 0 auto;
}
.qheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #dee2e6;
}
.qnumber {
  font-weight: bold;
  color: #495057;
  font-size: 0.85em;
}
.qchapter {
  color: #6c757d;
  font-size: 0.85em;
  flex-grow: 1;
  text-align: center;
}
.qpoints {
  background: #ffc107;
  color: #000;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8em;
  font-weight: bold;
}
.pretext {
  font-style: italic;
  color: #495057;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #e9ecef;
  border-radius: 4px;
}
.question {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 12px;
  line-height: 1.4;
}
.qimage {
  text-align: center;
  margin-bottom: 12px;
}
.qimage img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.answers {
  margin-top: 10px;
}
.answer {
  padding: 8px 12px;
  margin: 4px 0;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  line-height: 1.4;
}
.correct {
  margin-top: 12px;
  padding: 8px 12px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  font-weight: bold;
  color: #155724;
}
.showhint {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 20px;
}
.explanation {
  font-size: 0.9em;
  color: #495057;
  line-height: 1.5;
  padding: 8px;
}
'''
)

# Create sub-decks for each topic
decks = {}
notes = []
media_files = []

for topic_name, qids in sorted(topic_questions.items()):
    # Create a deck for this topic
    # Use a deterministic deck ID based on topic name
    topic_deck_id = int(hashlib.md5(topic_name.encode()).hexdigest()[:8], 16)
    
    # Determine the top-level group
    parts = topic_name.split(" - ")
    if len(parts) >= 2:
        group = parts[0].strip()
        subtopic = parts[1].strip() if len(parts) > 1 else ""
    else:
        group = "Other"
        subtopic = topic_name
    
    deck = genanki.Deck(
        topic_deck_id,
        f"German Driving Theory::{topic_name}"
    )
    decks[topic_name] = deck

# Now create notes for each question
for idx, q in questions.items():
    chapter = q.get('chapter', 'unknown')
    topic_name = CHAPTER_NAMES.get(chapter, f"Unknown ({chapter})")
    
    # Build answer fields with correct/incorrect markers
    answer_fields = []
    correct_answers = []
    
    for i in range(1, 5):
        ans_key = f'asw_{i}_en'
        corr_key = f'asw_corr{i}'
        
        if ans_key in q:
            answer_text = q[ans_key]
            is_correct = q.get(corr_key, 0) == 1
            
            if is_correct:
                correct_answers.append(answer_text)
                marker = "✓"
            else:
                marker = "✗"
            
            answer_fields.append(f'<span class="{"correct-mark" if is_correct else "wrong-mark"}">{marker}</span> {answer_text}')
        else:
            answer_fields.append("")
    
    # Image field
    image_field = ""
    pic = q.get('picture', '')
    if pic:
        local_path = os.path.join(IMAGE_DIR, pic)
        if os.path.exists(local_path):
            image_field = f'<img src="{pic}">'
            media_files.append(local_path)
    
    # Explanation field
    explanation = ""
    # We could add question info here, but the English infos file was 404
    # Skip for now
    
    # PreText
    pretext = q.get('asw_pretext_en', '')
    
    # Points
    points = q.get('points', 3)
    
    # Create the note
    note = genanki.Note(
        model=model,
        fields=[
            q.get('number', ''),
            topic_name,
            pretext,
            q.get('text_en', ''),
            image_field,
            answer_fields[0] if len(answer_fields) > 0 else '',
            answer_fields[1] if len(answer_fields) > 1 else '',
            answer_fields[2] if len(answer_fields) > 2 else '',
            answer_fields[3] if len(answer_fields) > 3 else '',
            'Correct: ' + '; '.join(correct_answers),
            str(points),
            explanation,
        ],
        tags=[f'chapter::{chapter}', f'topic::{topic_name.replace(" ", "_")}']
    )
    
    # Add note to the appropriate deck
    if topic_name in decks:
        decks[topic_name].add_note(note)
    notes.append(note)

print(f"  Created {len(notes)} notes across {len(decks)} decks")

# ─── Step 6: Package the deck ───────────────────────────────────────────────
print("Step 6: Packaging Anki deck...")

# Create a package with all decks
package = genanki.Package(list(decks.values()))
package.media_files = list(set(media_files))  # Deduplicate

package.write_to_file(OUTPUT_APKG)

print(f"\n✅ Anki deck created successfully!")
print(f"   File: {OUTPUT_APKG}")
print(f"   Total questions: {len(notes)}")
print(f"   Total images: {len(set(media_files))}")
print(f"   Decks: {len(decks)}")

# Print summary by topic
print("\n   Deck Summary:")
for topic_name in sorted(topic_questions.keys()):
    qids = topic_questions[topic_name]
    print(f"     {topic_name}: {len(qids)} questions")