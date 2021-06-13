const axios = require("axios");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const keys = require("./keys");

/* Azure Cognitive Services Variables */
const COGNITIVE_SERVICES_ENDPOINT =
  "https://c964-josh.cognitiveservices.azure.com/vision";
const FEATURES = "Adult,Categories,Description,Objects";
const DETAILS = "Celebrities";
let AZURE_API_KEY = keys.cognitiveServicesApiKey;
const AZURE_HEADERS = { "Ocp-Apim-Subscription-Key": AZURE_API_KEY };
const AZURE_FULL_URL = `${COGNITIVE_SERVICES_ENDPOINT}/v3.1/analyze?visualFeatures=${FEATURES}&details=${DETAILS}`;

/* 4chan API Variables */
const FOURCHAN_ENDPOINT = "https://a.4cdn.org/b/catalog.json";
const FOURCHAN_IMAGES_ENDPOINT = "https://i.4cdn.org/b/";
const FOURCHAN_MAX_PAGES = 9;
const FOURCHAN_MAX_THREADS_PER_PAGE = 14;

app.use(express.json());

app.get("/", (req, res) => {
  res.send({ message: "What up, fam?" }).status(200);
});

app.get("/image", (req, res) => {
  /*
    Structure of Cognitive Services response
      response.data
      response.data.categories
      response.data.adult
      response.data.description
      response.data.description.captions
  */
  let uri = AZURE_FULL_URL;
  let body = { url: req.body.url };

  axios({
    method: "POST",
    headers: AZURE_HEADERS,
    url: AZURE_FULL_URL,
    data: body,
  })
    .then((response) => {
      res.send(response.data).status(200);
    })
    .catch((error) => {
      // Handle error
      res.send({ error: error.message, details: error }).status(500);
    });
});

app.get("/4chan", (req, res) => {
  /*
      4chan API docs: https://github.com/4chan/4chan-API/blob/master/pages/Endpoints_and_domains.md
      Image URL base: https://i.4cdn.org/b/
      Structure of 4chan API response
        response.data.length --> 10 (returns 10 pages)
        response.data[0].threads.length --> 15 (returns 15 threads per page)
        response.data[0].threads[0].tim + response.data[0].threads[0].ext --> filename.jpg (For example)
        Full Image URL: FOURCHAN_IMAGES_ENDPOINT + response.data[0].threads[0].tim + response.data[0].threads[0].ext
  */
  axios({
    method: "GET",
    url: FOURCHAN_ENDPOINT,
  })
    .then((response) => {
      let randomPage = Math.floor(Math.random() * FOURCHAN_MAX_PAGES);
      let randomThread = Math.floor(
        Math.random() * FOURCHAN_MAX_THREADS_PER_PAGE
      );

      /* Build the URL for the random image from 4chan */
      let random4chanImage =
        FOURCHAN_IMAGES_ENDPOINT +
        response.data[randomPage].threads[randomThread].tim +
        response.data[randomPage].threads[randomThread].ext;

      /* After retrieving a random image from 4chan, send it to Cognitive Services for Analysis */
      axios({
        method: "POST",
        headers: AZURE_HEADERS,
        url: AZURE_FULL_URL,
        data: { url: random4chanImage },
      })
        .then((response) => {
          /* Get the response from Cognitive Services and append the image URL */
          let cognitiveServicesResponse = response.data;
          cognitiveServicesResponse["imageurl"] = random4chanImage;

          // Send response back to the front end
          res.send(cognitiveServicesResponse).status(200);
        })
        .catch((azureError) => {
          res.send({
            error: azureError.message,
            details: azureError,
            platform: "azureapi",
          });
        });
      //res.send({ url: random4chanImage }).status(200);
    })
    .catch((error) => {
      // Handle error
      res
        .send({ error: error.message, details: error, platform: "4chanapi" })
        .status(500);
    });
});

app.listen(port, () => {
  //console.log(`Example app listening at http://localhost:${port}`);
});
