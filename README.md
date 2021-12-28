<h1>4chan Image Analysis Middleware</h1>

```diff
- WARNING: Live images are being pulled from the 4chan for analysis and could contain NSFW content.
```
Live Application URL: https://c964imagemirrors.z5.web.core.windows.net/

<h2>Description</h2>
Project consists of a single-page application (SPA) which grabs a random image from 4chan, runs the image through the analysis pipeline and displays the results. The results contain the image classifications retrieved from Azure Cognitive Services Computer Vision as well as the final decision (SFW or NSFW) from my trained ML model, given the Computer Vision classifications. The web application blurs the image upon initial display but allows you to un-blur it by clicking.
<br />
<br />
<p align="center">
<img src="https://i.imgur.com/Bj5DTJ6.png" height="65%" width="65%" alt="a man with a beard"/>
</p>
<h2>Languages and Environments Used</h2>
<!--
 ```diff
- text in red
+ text in green
! text in orange
# text in gray
@@ text in purple (and bold)@@
```
--!>
