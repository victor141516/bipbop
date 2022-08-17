FROM kasmweb/chrome:develop
EXPOSE 16667
USER root
RUN apt-get update && \
  apt-get install -y socat libxtst-dev nodejs npm && \
  npm install -g n && \
  n 18
ENV APP_ARGS '--remote-debugging-port=16666 --remote-debugging-address=0.0.0.0 --start-maximized'
USER 1000
COPY ./init.sh /init.sh
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