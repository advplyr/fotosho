# Fotosho

Fotosho is a photo gallery for your home server.

* Free and open source
* Does not require a database
* Uses your photo directory, does not copy images
* Does not modify, move or delete your photos from their original location

<img alt="Screenshot" src="https://github.com/advplyr/fotosho/raw/master/static/Screenshot1.png" />


**Note: Initial scan of your photo dir can take 10+ minutes for larger photo collections. This is because a fingerprint is generated for each photo. For reference, my 3,000 photo 25GB collection takes ~5 minutes.*

## Features


* Thumbnail & preview image is generated for each photo
* Slideshow w/ auto slide on a timer
* Group photos into albums
* Search & sort photos
* Watches your photo directory for new/removed photos


## Docker

This project was built to run as a docker container.

[Docker Hub](https://hub.docker.com/r/advplyr/fotosho/)

## Contributing

**Backend**: Express + Socket.io

**Frontend**: Vue + Tailwind