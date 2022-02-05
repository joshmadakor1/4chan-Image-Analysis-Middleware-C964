<h1>NSFW Image Analysis Middleware</h1>


 ### [Live Project](https://c964imagemirrors.z5.web.core.windows.net/)
 ### [YouTube Demonstration](https://youtu.be/7eJexJVCqJo)

<h2>
 
```diff
- WARNING (NSFW): RANDOM live images will be pulled from NSFW location.
```
 
 </h2>

<h2>Description</h2>
Project consists of a single-page application (SPA) which grabs a random image from 4chan, runs the image through the analysis pipeline and displays the results. The results contain the image classifications retrieved from Azure Cognitive Services Computer Vision as well as the final decision (SFW or NSFW) from my trained ML model, given the Computer Vision classifications. The web application blurs the image upon initial display but allows you to un-blur it by clicking.
<br />
<br />

<p align="center">
<img src="https://i.imgur.com/Q46tijN.png" height="65%" width="65%" alt="Frankie Grande, Ariana Grande et al. are posing for a picture"/>
</p>
<h2>Languages Used</h2>

- <b>Python Django (backend):</b> scikit-learn ML model 
- <b>[Node.JS (backend):](https://github.com/joshmadakor1/4chan-Image-Analysis-Middleware-C964)</b> control data flow between all components
- <b>[React (frontend):](https://github.com/joshmadakor1/C964-WGU-BSCS-Capstone-React)</b> single page application (SPA)

<h2>Environments Used (PaaS Components)</h2>

- <b>Azure App Service:</b> hosting Node.JS and Django components
- <b>Azure Storage Account:</b> running React Static Page
- <b>Azure Cosmos DB:</b> Storage SFW/NSFW analytics and historical data
- <b>Azure Cognitive Services:</b> Used to general data used for SFW/NSFW decision

<h2>Image Analysis Data Flow</h2>

<p align="center">
<img src="https://i.imgur.com/UeNTKzL.png" height="65%" width="65%" alt="Image Analysis Dataflow"/>
</p>

<!--
 ```diff
- text in red
+ text in green
! text in orange
# text in gray
@@ text in purple (and bold)@@
```
--!>
