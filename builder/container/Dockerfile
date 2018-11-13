FROM mhart/alpine-node:10
MAINTAINER josh.holbrook@gmail.com

RUN apk add curl jq git bash

RUN adduser -D -s /bin/bash -h /var/ws anon
RUN chown -R anon:anon /var/ws
WORKDIR /var/ws
COPY package.json ./
RUN npm install
ENV PATH /var/ws/node_modules/.bin:${PATH}
COPY build.sh ./
RUN chmod 555 build.sh
COPY versions.sh ./
RUN chmod 555 versions.sh
COPY explode.sh ./
RUN chmod 555 explode.sh
USER anon

