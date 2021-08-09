const axios = require("axios");
const express = require("express");
const app = express();
const port = process.env.PORT || 3030;
const keys = require("./keys");
const fs = require("fs");
const CosmosClient = require("@azure/cosmos").CosmosClient;
const { send } = require("process");

/*
TODO: Delete local image after uploading to azure Blob
TODO: Move Storage Account Key into password file lol

*/
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

/* ML Variables */
const ML_ENDPOINT = "https://c960djangomlapi.azurewebsites.net/analyze";

/* Azure Storage Account and Cosmos DB Variables */
STORAGE_ACCOUNT_NAME = keys.storageAccountName;
const COSMOS_DB_ENDPOINT = "https://c964analytics.documents.azure.com:443/";
const COSMOS_DB_CONNECTION_STRING = keys.cosmosDbConnectionString;
const client = new CosmosClient(COSMOS_DB_CONNECTION_STRING);
const database = client.database(keys.cosmosDbDatabaseId);
const container = database.container(keys.cosmosDbContainerId);

/* Enable ability to parse the body */
app.use(express.json());

/* Enable calls from other domains; instead of GET, change to [*] for all */
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});

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

      /* Cognitive Services can't handle Webms and animated gifs */
      while (
        response.data[randomPage].threads[randomThread].ext === "webm" ||
        response.data[randomPage].threads[randomThread].ext === "gif"
      ) {
        randomPage = Math.floor(Math.random() * FOURCHAN_MAX_PAGES);
        randomThread = Math.floor(
          Math.random() * FOURCHAN_MAX_THREADS_PER_PAGE
        );
      }

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
          let cognitiveServicesResponse = response.data;
          cognitiveServicesResponse["imageurl"] = random4chanImage;
          axios({
            method: "GET",
            url: ML_ENDPOINT,
            data: {
              adultScore: cognitiveServicesResponse.adult.adultScore,
              racyScore: cognitiveServicesResponse.adult.racyScore,
              goreScore: cognitiveServicesResponse.adult.goreScore,
            },
          }).then((response) => {
            // Send response back to the front end
            console.log(response.data);
            cognitiveServicesResponse["aimlverdict"] = response.data;
            res.send(cognitiveServicesResponse).status(200);
          });
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

app.get("/4chanraw", (req, res) => {
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

      /* Cognitive Services can't handle Webms and animated gifs */
      while (
        response.data[randomPage].threads[randomThread].ext === "webm" ||
        response.data[randomPage].threads[randomThread].ext === "gif"
      ) {
        randomPage = Math.floor(Math.random() * FOURCHAN_MAX_PAGES);
        randomThread = Math.floor(
          Math.random() * FOURCHAN_MAX_THREADS_PER_PAGE
        );
      }

      let random4chanImage =
        FOURCHAN_IMAGES_ENDPOINT +
        response.data[randomPage].threads[randomThread].tim +
        response.data[randomPage].threads[randomThread].ext;
      let imageName =
        response.data[randomPage].threads[randomThread].tim +
        response.data[randomPage].threads[randomThread].ext;

      //let random4chanImage = "https://i.imgur.com/X8hiPwF.jpg";

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
          cognitiveServicesResponse["4chanimageurl"] = random4chanImage;
          cognitiveServicesResponse[
            "mirrorimageurl"
          ] = `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net/%24web/${imageName}`;

          /* Save the 4chan image locally */
          let writer = fs.createWriteStream(imageName).on("close", () => {
            /* Once the file has been saved locally, Upload a mirror to Azure Storage Account */
            uploadFileToBlob(imageName)
              .then((result) => {
                //console.log("result");
                //console.log(result);

                /* Once the file has been uploaded, update Analytics and send all data back to the front end */
                let query = {
                  query: `SELECT * FROM c WHERE c.id="${keys.cosmosDbAnalyticsRecordId}"`,
                };

                container.items
                  .query(query)
                  .fetchAll()
                  .then((analyticsRecord) => {
                    //const { id } = analyticsRecord.resources[0];

                    analyticsRecord.resources[0].stats.count++;

                    // If Image is clean, increment clean
                    if (
                      cognitiveServicesResponse.adult.isAdultContent ===
                        false &&
                      cognitiveServicesResponse.adult.isRacyContent === false &&
                      cognitiveServicesResponse.adult.isGoryContent == false
                    ) {
                      analyticsRecord.resources[0].stats.clean++;
                    }
                    // If Image is dirty, update NSFW
                    else {
                      analyticsRecord.resources[0].stats.nsfw++;
                    }
                    console.log("Got Analytics Record");

                    if (
                      cognitiveServicesResponse.adult.isAdultContent === true
                    ) {
                      analyticsRecord.resources[0].stats.adult++;
                    }

                    if (
                      cognitiveServicesResponse.adult.isRacyContent === true
                    ) {
                      analyticsRecord.resources[0].stats.sus++;
                    }

                    if (
                      cognitiveServicesResponse.adult.isGoryContent === true
                    ) {
                      analyticsRecord.resources[0].stats.gore++;
                    }

                    /* Update Record */
                    container
                      .item(keys.cosmosDbAnalyticsRecordId)
                      .replace(analyticsRecord.resources[0])
                      .then((result) => {
                        cognitiveServicesResponse["analytics"] =
                          analyticsRecord.resources[0].stats;

                        cognitiveServicesResponse["imageurl"] =
                          random4chanImage;
                        axios({
                          method: "GET",
                          url: ML_ENDPOINT,
                          data: {
                            adultScore:
                              cognitiveServicesResponse.adult.adultScore,
                            racyScore:
                              cognitiveServicesResponse.adult.racyScore,
                            goreScore:
                              cognitiveServicesResponse.adult.goreScore,
                          },
                        }).then((response) => {
                          // Send response back to the front end
                          console.log(response.data);
                          cognitiveServicesResponse["aimlverdict"] =
                            response.data.nsfw;
                          res
                            .send(cognitiveServicesResponse)
                            .status(200)
                            .on("finish", () => {
                              //console.log("I'm done lol");
                              //delete files off disk lol
                              try {
                                fs.unlinkSync(imageName);
                                //file removed
                              } catch (err) {
                                console.error(err);
                              }
                            });
                        });
                      });
                  });
              })
              .catch((error) => {
                console.log(error);
                /* If something messed up, send an error back */
                res.send(error).status(500);
              });

            /* After Image was sent to azure Storage, delete it locally and send new URL back to client */
          });

          axios({
            url: random4chanImage,
            method: "GET",
            responseType: "stream",
          }).then((response) => {
            response.data.pipe(writer);

            //cognitiveServicesResponse["imagedata"] = response.data;
            // Send response back to the front end
          });
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

app.get("/custom", (req, res) => {
  let random4chanImage = req.body.url;
  let imageName =
    Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, "")
      .substr(0, 10) +
    "." +
    random4chanImage.split(/[#?]/)[0].split(".").pop().trim();
  axios({
    method: "POST",
    headers: AZURE_HEADERS,
    url: AZURE_FULL_URL,
    data: { url: random4chanImage },
  })
    .then((response) => {
      /* Get the response from Cognitive Services and append the image URL */
      let cognitiveServicesResponse = response.data;
      cognitiveServicesResponse["4chanimageurl"] = random4chanImage;
      cognitiveServicesResponse[
        "mirrorimageurl"
      ] = `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net/%24web/${imageName}`;

      /* Save the 4chan image locally */
      let writer = fs.createWriteStream(imageName).on("close", () => {
        /* Once the file has been saved locally, Upload a mirror to Azure Storage Account */
        uploadFileToBlob(imageName)
          .then((result) => {
            //console.log("result");
            //console.log(result);

            /* Once the file has been uploaded, update Analytics and send all data back to the front end */
            let query = {
              query: `SELECT * FROM c WHERE c.id="${keys.cosmosDbAnalyticsRecordId}"`,
            };

            container.items
              .query(query)
              .fetchAll()
              .then((analyticsRecord) => {
                //const { id } = analyticsRecord.resources[0];

                analyticsRecord.resources[0].stats.count++;

                // If Image is clean, increment clean
                if (
                  cognitiveServicesResponse.adult.isAdultContent === false &&
                  cognitiveServicesResponse.adult.isRacyContent === false &&
                  cognitiveServicesResponse.adult.isGoryContent == false
                ) {
                  analyticsRecord.resources[0].stats.clean++;
                }
                // If Image is dirty, update NSFW
                else {
                  analyticsRecord.resources[0].stats.nsfw++;
                }
                console.log("Got Analytics Record");

                if (cognitiveServicesResponse.adult.isAdultContent === true) {
                  analyticsRecord.resources[0].stats.adult++;
                }

                if (cognitiveServicesResponse.adult.isRacyContent === true) {
                  analyticsRecord.resources[0].stats.sus++;
                }

                if (cognitiveServicesResponse.adult.isGoryContent === true) {
                  analyticsRecord.resources[0].stats.gore++;
                }

                /* Update Record */
                container
                  .item(keys.cosmosDbAnalyticsRecordId)
                  .replace(analyticsRecord.resources[0])
                  .then((result) => {
                    cognitiveServicesResponse["analytics"] =
                      analyticsRecord.resources[0].stats;

                    cognitiveServicesResponse["imageurl"] = random4chanImage;
                    axios({
                      method: "GET",
                      url: ML_ENDPOINT,
                      data: {
                        adultScore: cognitiveServicesResponse.adult.adultScore,
                        racyScore: cognitiveServicesResponse.adult.racyScore,
                        goreScore: cognitiveServicesResponse.adult.goreScore,
                      },
                    }).then((response) => {
                      // Send response back to the front end
                      console.log(response.data);
                      cognitiveServicesResponse["aimlverdict"] =
                        response.data.nsfw;
                      res
                        .send(cognitiveServicesResponse)
                        .status(200)
                        .on("finish", () => {
                          //console.log("I'm done lol");
                          //delete files off disk lol
                          try {
                            fs.unlinkSync(imageName);
                            //file removed
                          } catch (err) {
                            console.error(err);
                          }
                        });
                    });
                  });
              });
          })
          .catch((error) => {
            console.log(error);
            /* If something messed up, send an error back */
            res.send(error).status(500);
          });

        /* After Image was sent to azure Storage, delete it locally and send new URL back to client */
      });

      axios({
        url: random4chanImage,
        method: "GET",
        responseType: "stream",
      }).then((response) => {
        response.data.pipe(writer);

        //cognitiveServicesResponse["imagedata"] = response.data;
        // Send response back to the front end
      });
    })
    .catch((azureError) => {
      res.send({
        error: azureError.message,
        details: azureError,
        platform: "azureapi",
      });
    });
});
app.listen(port, () => {
  //console.log(`Example app listening at http://localhost:${port}`);
  let query = {
    query: `SELECT * FROM c WHERE c.id="${keys.cosmosDbAnalyticsRecordId}"`,
  };

  container.items
    .query(query)
    .fetchAll()
    .then((ass) => {
      //const { id } = ass.resources[0];
      console.log("Finished GET");
      //console.log(id);
      //console.log(ass);
      //console.log(ass.resources[0].id);
      // ass.resources[0].stats = { adult: 0, sus: 0, gore: 0, nsfw: 0, clean: 0 }

      /* Update Record */
      //ass.resources[0].stats.adult++;

      container
        .item(keys.cosmosDbAnalyticsRecordId)
        .replace(ass.resources[0])
        .then((result) => {
          //console.log("Finished UPDATE");
          //console.log(result);
        });
    });
});

const uploadFileToBlob = async (file) => {
  const { AbortController } = require("@azure/abort-controller");
  const {
    AnonymousCredential,
    BlobServiceClient,
    newPipeline,
  } = require("@azure/storage-blob");
  const account = `${STORAGE_ACCOUNT_NAME}`;
  const accountSas = keys.storageAccountSasKey;
  const localFilePath = file;
  const pipeline = newPipeline(new AnonymousCredential(), {
    // httpClient: MyHTTPClient, // A customized HTTP client implementing IHttpClient interface
    retryOptions: { maxTries: 4 }, // Retry options
    userAgentOptions: { userAgentPrefix: "AdvancedSample V1.0.0" }, // Customized telemetry string
    keepAliveOptions: {
      // Keep alive is enabled by default, disable keep alive by setting false
      enable: false,
    },
  });
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net${accountSas}`,
    pipeline
  );
  const containerName = "$web";
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobName = file;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  //console.log("blockBlobClient", blockBlobClient);
  try {
    const result = await blockBlobClient.uploadFile(localFilePath, {
      blockSize: 4 * 1024 * 1024, // 4MB block size
      concurrency: 20, // 20 concurrency
      onProgress: (ev) => console.log(ev),
    });
    //console.log("uploadFile succeeds");
    return result;
  } catch (err) {
    //console.log(`uploadFile failed, requestId - ${err.details.requestId}, statusCode - ${err.statusCode}, errorCode - ${err.details.errorCode}`);
    throw err;
  }
};
