# BipBop 🤖

This is a very WIP project.

Currently it has 3 parts:

 - Docker: a Docker image based on [Kasm's Chrome image](https://hub.docker.com/r/kasmweb/chrome), using some tweaks, and extended by `pilot`
 - `pilot`: a HTTP API that allows to get data from the running Chrome using CDP and interact with mouse and keyboard (instead of using CDP)
 - `passenger`: a client for `pilot` and also the beggining of a new project I'll work on

## Why

I want to create a tool to automatically unsubscribe from streaming services like Netflix, HBO Max, Spotify, etc. because most of the time I use just one of them at a time.

I tried to implement some script that does that, but these services try hard to block bots from logging in.

That's why I decided to create a browser automation tool that tries harder to not be detected.

## How

I heavily based `pilot` on [this Nikolai Tschacher blog post](https://incolumitas.com/2021/05/20/avoid-puppeteer-and-playwright-for-scraping/) so probably you should go there and read his post.

Anyway long story short:

 - Use CDP only for getting data from Chrome, not for interacting with it.
 - Use mouse and keyboard automation since those are harder to detect.
 - Don't use straight and fast mouse movements. Try to replicate human movements.
 - Type like a human: (1) not too fast, (2) not at a regular speed, (3) sometimes overlap keystrokes.

This is more or less implemented on `pilot`, except for the keyboard part.

## `passenger`

This is currently a mess:

 - There is a client for `pilot` that maybe could make sense to pull apart and make a npm module out of it
 - There is also a service that takes care of unsubscribing from Netflix. This will be soon it's own project.

So probably I'll remove this `passenger` thing soon, but as I said it's still WIP and I liked the pilot/passenger pun.

<p align="center"><img width="200" src="https://user-images.githubusercontent.com/5548950/185271182-1275fb99-6592-47e8-a208-420ed43a9f50.png"/></p>

## How to use

Build the Docker image:
```sh
docker build -t victor141516/bipbop-pilot .
```

Run the image:
```sh
docker run \
  --rm -it \
  --name bipbop-pilot \
  --shm-size=512m \
  -p 6901:6901 \
  -p 3000:3000 \
  -e VNC_PW=password \
  victor141516/bipbop-pilot
```

Then you can open https://localhost:6901 in your browser. It'll show a big-scary-red screen complaining about certificated. I don't know why you can't just skip that like usual using the _Advanced_ button. You'll have to type `thisisunsafe`. Yeah, just type that while having the browser open and it'll skip the red page.

Okay that's the remote browser. You can see what `pilot` is doing using that.

`pilot` uses the other port (3000) as default. Now you can send some request to `pilot` using curl:
```sh
curl -s -XPOST -H 'content-type: application/json' -d '["https://github.com"]' http://localhost:3000/api/v1/navigateTo
```

You should see GitHub on the remote browser.

Then you can check the rest of the endpoints in [this majestic documentation](https://github.com/victor141516/bipbop/blob/master/pilot/src/services/browser/index.ts). Endpoints are the name of the functions, and the payload is an array of the function parameters. Easy peasy.

You can also (for now) use `passenger` to cancel your Netflix subscription:
 - Edit `/passenger/src/index.ts` to set your email and password.
 - `npm i`
 - `npm start`

I'll probably fail because this is a project I began working on yesterday. Also it won't work if your email or password have exotic characters like `_` (yes, underscore... \*sigh*)

<p align="center"><img width="200" src="https://user-images.githubusercontent.com/5548950/185271182-1275fb99-6592-47e8-a208-420ed43a9f50.png"/><img width="200" src="https://user-images.githubusercontent.com/5548950/185271182-1275fb99-6592-47e8-a208-420ed43a9f50.png"/><img width="200" src="https://user-images.githubusercontent.com/5548950/185271182-1275fb99-6592-47e8-a208-420ed43a9f50.png"/></p>
