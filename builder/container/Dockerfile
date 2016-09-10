# Adopted largely from https://github.com/brigand/docker-js-eval

FROM ubuntu
MAINTAINER josh.holbrook@gmail.com

RUN apt-get update && apt-get install -y curl jq git

RUN adduser --disabled-password --shell /bin/bash --home /var/ws anon
RUN chown -R anon:anon /var/ws
WORKDIR /var/ws
RUN bash -c '\
  git clone https://github.com/creationix/nvm.git nvm; \
  . ./nvm/nvm.sh; \
  nvm install 4;\
  mkdir -p ./node_modules;\
  npm install browserify@13;\
  npm install uglifyjs@2;\
  npm install glob@7;'
ENV PATH /var/ws/node_modules/.bin:${PATH}
COPY build.sh ./
RUN chmod 555 build.sh
USER anon

CMD ["bash", "build.sh"]

