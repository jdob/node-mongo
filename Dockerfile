FROM node:8
LABEL version="1" 
LABEL name="Node OpenShift Hello World App"
LABEL vendor="Red Hat"
LABEL release="1"

EXPOSE 8080

ENV HOME=/opt/app-root
WORKDIR ${HOME}

RUN mkdir -p /licenses
COPY license.md /licenses/


# Install app dependencies 
COPY package.json .
RUN npm install

# Bundle app source
COPY . .

RUN useradd -u 1337 -r -g 0 -d ${HOME} -s /sbin/nologin \
    -c "Default node-web user" nodeweb

RUN chown -R 1337:0 ${HOME} && \
    find ${HOME} -type d -exec chmod g+ws {} \;

USER 1337
CMD [ "npm", "start" ]