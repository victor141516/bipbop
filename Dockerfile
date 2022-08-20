FROM kasmweb/chrome:develop
ENV APP_ARGS '--remote-debugging-port=16666 --remote-debugging-address=0.0.0.0 --start-maximized --disable-notifications --password-store=basic --disable-save-password-bubble --disable-features=Translate'
USER root
RUN apt-get update && \
  apt-get install -y libxtst-dev nodejs npm xorg-dev libpng-dev && \
  npm install -g n && \
  n 18 && \
  chown -R 1000:1000 /home/kasm-user && \
  mkdir -p /pilot && \
  mkdir -p /etc/opt/chrome/policies/managed && \
  echo '{"PasswordManagerEnabled": false}' > /etc/opt/chrome/policies/managed/disable_password_manager.json


COPY ./pilot/package.json ./pilot/package-lock.json /pilot/
RUN cd /pilot && npm i
COPY ./pilot /pilot/

COPY ./docker/init.sh /init.sh
USER 1000
ENTRYPOINT []
CMD ["/init.sh"]
