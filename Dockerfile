FROM kasmweb/chrome:develop
USER root
RUN apt-get update && \
  apt-get install -y libxtst-dev nodejs npm && \
  npm install -g n && \
  n 18 && \
  chown -R 1000:1000 /home/kasm-user && \
  mkdir -p /pilot

ENV APP_ARGS '--remote-debugging-port=16666 --remote-debugging-address=0.0.0.0 --start-maximized'

COPY ./pilot/package.json ./pilot/package-lock.json /pilot/
RUN cd /pilot && npm i
COPY ./pilot /pilot/

COPY ./docker/init.sh /init.sh
USER 1000
ENTRYPOINT []
CMD ["/init.sh"]

# docker run \
#   --rm \
#   -it \
#   --shm-size=512m \
#   -p 6901:6901 \
#   -p 16667:16667 \
#   -e APP_ARGS='--remote-debugging-port=16666 --remote-debugging-address=0.0.0.0' \
#   --name chrome-bipbop \
#   -e VNC_PW=password \
#   the-image