from flask import Flask, render_template, jsonify
import json

app = Flask(__name__)

# Load data from JSON files
with open('force_directed_graph_data.json', 'r') as file:
    force_directed_graph = json.load(file)
    
with open('top.json', 'r') as file:
    word_cloud = json.load(file)
    
with open('heatmap_data.json', 'r') as file:
    heat_map = json.load(file)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

# API endpoints for data
@app.route('/FDA', methods=['GET'])
def get_FDA():
    return jsonify(force_directed_graph)

@app.route('/WC', methods=['GET'])
def get_WC():
    return jsonify(word_cloud)

@app.route('/HM', methods=['GET'])
def get_HM():
    return jsonify(heat_map)

# Additional pages
@app.route('/page1')
def page1():
    return render_template('page1.html')

@app.route('/page2')
def page2():
    return render_template('page2.html')

@app.route('/page3')
def page3():
    return render_template('page3.html')

if __name__ == '__main__':
    app.run(debug=True)