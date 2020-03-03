'use strict';

// Middleware and Dependencies
require('dotenv').config();

const express = require('express');
const app = express();
require('ejs');
const superagent = require('superagent');
const methodOverride = require('method-override');

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true,}));
// app.use(express.static('./public')); -----------no public folder yet
app.use(methodOverride('_method'));
const pg = require('pg');

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.error(err));

const PORT = process.env.PORT || 3001;

// Routes
app.get('/', renderHomePage);
app.post('/search', handleSearch);
app.get('/recipeResults', renderRecipes);
app.post('/save', saveRecipe);
app.get('/foodforlater', renderMyList);

let query;

// Functions
function renderHomePage(request, response){
  response.render('./index.ejs');
}

function renderRecipes(request, response){
  response.render('./results.ejs');
}

function renderMyList(request, response){
  const sql = `SELECT * FROM recipes;`;
  client.query(sql).then(results => {
    let recipes = results.rows;
    response.render('./mylist.ejs', {results: recipes});
  });
}

function handleSearch(request, response) {
  query = request.body.search;
  let url = `https://api.edamam.com/search?q=${query}&app_id=${process.env.EDAMAM_ID}&app_key=${process.env.EDAMAM_KEY}`;
  superagent.get(url).then(results => {
    const resultsArray = results.body.hits;
    const finalArray = resultsArray.map(recipe => {
      return new Recipe(recipe);
    });
    response.render('./results.ejs', {results: finalArray});
  });
}

function saveRecipe(request, response) {
  console.log(request.body);
  let {label, image_url, ingredientLines, recipe_url, dietLabels, healthLabels} = request.body;
  let sql = `INSERT INTO recipes (label, image_url, ingredientlines, recipe_url, dietLabels, healthLabels) VALUES ($1, $2, $3, $4, $5, $6);`;
  let safeValues = [label, image_url, ingredientLines, recipe_url, dietLabels, healthLabels];
  client.query(sql, safeValues).then( () => {
    response.redirect(`/foodforlater`);
  });
}

function Recipe(obj){
  this.label = obj.recipe.label;
  this.image_url = obj.recipe.image;
  this.ingredientLines = obj.recipe.ingredientLines;
  this.recipe_url = obj.recipe.url;
  this.dietLabels = obj.recipe.dietLabels;
  this.healthLabels = obj.recipe.healthLabels;
}

// Turn on the DB and the Server
client.connect()
  .then(
    app.listen(PORT, () => console.log(`listening on ${PORT}`))
  );
