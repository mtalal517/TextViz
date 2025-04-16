# TextViz - Interactive NLP Visualizations from Movie Dialogues

## 📌 Overview

**TextViz** is a Python-based web application that visualizes natural language data from the **Cornell Movie Dialogs Dataset** using interactive D3.js visualizations. The goal is to explore relationships, sentiment, and patterns in movie dialogue through engaging and meaningful charts.

This project was built as part of an academic exploration of textual data and visual storytelling using Focus+Context techniques, graph theory, and brushing & linking interactions.

---

## ✨ Features

- 🧠 **NLP with Python & NLTK**:
  - Named Entity Recognition (NER)
  - Tokenization & Frequency Analysis

- 📊 **Interactive Visualizations using D3.js**:
  - **Word Cloud** – Common keywords in movie titles
  - **Heatmap** – Sentiment distribution across movies
  - **Force-Directed Graph** – Character/movie relationships

- 🔍 **Focus + Context**:
  - Each visualization supports zooming, panning, tooltips, and contextual filtering.
  - Real-time updates via brushing and linking between views.

---

## 🛠️ Technologies Used

- **Backend**: Python, Flask
- **Frontend**: HTML, CSS, JavaScript, D3.js
- **NLP Tools**: NLTK (Named Entity Recognition, tokenization)
- **Data Format**: JSON-based visual data

---

## 📁 Project Structure

```
TextViz/
├── main.py                      # Flask backend with API routes
├── templates/
│   └── index.html               # Main HTML page with layout
│   └── page1.html               
│   └── page2.html               
│   └── page3.html               
├── static/
│   ├── cloud.js                 # D3 Word Cloud script
│   ├── heat.js                  # D3 Heatmap script
│   ├── FDA.js                   # D3 Force-Directed Graph script
├── force_directed_graph_data.json
├── heatmap_data.json
├── top.json                    # Data files served to frontend
├── NLP.ipynb                   # Jupyter notebook with preprocessing
```

---

## 🚀 Getting Started

### 🔧 Prerequisites

- Python 3.x
- pip

### ✅ Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/mtalal517/TextViz.git
   cd TextViz
   ```

2. **Set Up Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Backend Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Flask Server**:
   ```bash
   python main.py
   ```
   Visit `http://localhost:5000` to view the dashboard.

---

## 📊 Visualizations & Interactions

- **Word Cloud**: Zoom & filter by sentiment
- **Heatmap**: Toggle between sentiment types
- **Force-Directed Graph**: Zoom, drag, and explore character/movie links
- **Brushing & Linking**: Select an element and see updates across all visualizations

---

## 🙌 Acknowledgments

- Cornell Movie Dialogs Corpus
- Jason Davies (D3 Word Cloud)
- D3.js Community for reusable visualizations
