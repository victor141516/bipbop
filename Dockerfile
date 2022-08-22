FROM node:18.7.0 as pilot-builder
WORKDIR /pilot
COPY ./pilot/package.json ./pilot/package-lock.json /pilot/
RUN npm i
COPY ./pilot /pilot/


FROM kasmweb/chrome:1.11.0
ENV APP_ARGS '--remote-debugging-port=16666 --start-maximized --disable-notifications --password-store=basic --disable-save-password-bubble --disable-features=Translate'
USER root
COPY ./docker/supervisor/ /etc/supervisor/conf.d
RUN apt-get update && \
  apt-get install -y libxtst-dev nodejs npm xorg-dev libpng-dev && \
  npm install -g n && \
  n 18.7.0 && \
  chown -R 1000:1000 /home/kasm-user && \
  mkdir -p /pilot && \
  mkdir -p /etc/opt/chrome/policies/managed && \
  echo '{"PasswordManagerEnabled": false}' > /etc/opt/chrome/policies/managed/disable_password_manager.json && \
  mkdir -p /var/log/chrome
COPY --from=pilot-builder /pilot/ /pilot/

ENTRYPOINT []
CMD ["/usr/bin/supervisord", "--nodaemon"]
