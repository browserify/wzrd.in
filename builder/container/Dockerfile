# Adopted largely from https://github.com/brigand/docker-js-eval

FROM ubuntu
MAINTAINER josh.holbrook@gmail.com

RUN apt-get update && apt-get install -y curl jq git

RUN adduser --disabled-password --shell /bin/bash --home /var/ws anon
RUN chown -R anon:anon /var/ws
WORKDIR /var/ws
COPY package.json ./
RUN bash -c '\
  git clone https://github.com/creationix/nvm.git nvm; \
  . ./nvm/nvm.sh; \
  nvm install 4;\
  npm install;'
ENV PATH /var/ws/node_modules/.bin:${PATH}
COPY build.sh ./
RUN chmod 555 build.sh
COPY versions.sh ./
RUN chmod 555 versions.sh
COPY explode.sh ./
RUN chmod 555 explode.sh
USER anon

