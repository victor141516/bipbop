FROM node:18.7.0 as pilot-builder
WORKDIR /pilot
COPY ./pilot/package.json ./pilot/package-lock.json /pilot/
RUN npm i
COPY ./pilot /pilot/


FROM kasmweb/chrome:1.11.0
ENV APP_ARGS '--remote-debugging-port=16666 --start-maximized --disable-notifications --password-store=basic --disable-save-password-bubble --disable-features=Translate'
USER root

RUN apt-get update && \
  apt-get install -y nodejs npm && \
  npm install -g n && \
  n 18.7.0 && \
  apt-get autoremove -y && apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/

COPY ./docker/supervisor/ /etc/supervisor/conf.d

RUN apt-get update && \
  apt-get install -y libxtst-dev xorg-dev libpng-dev netcat && \
  chown -R 1000:1000 /home/kasm-user && \
  mkdir -p /pilot && \
  mkdir -p /etc/opt/chrome/policies/managed && \
  echo '{"PasswordManagerEnabled": false}' > /etc/opt/chrome/policies/managed/disable_password_manager.json && \
  mkdir -p /var/log/chrome && \
  apt-get autoremove -y && apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/

COPY --from=pilot-builder /pilot/ /pilot/
COPY ./docker/init/ /init/

ENTRYPOINT []
CMD ["/usr/bin/supervisord", "--nodaemon"]
