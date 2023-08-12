FROM node:18.17.0 as builder
ENV PUPPETEER_SKIP_DOWNLOAD=1
WORKDIR /build
RUN apt-get update && \
  apt-get install -y libopencv-dev
COPY ./package.json ./package-lock.json ./
RUN npm i && \
  mkdir -p ./dist-packages && \
  cp ./package.json ./package-lock.json ./dist-packages && \
  cd ./dist-packages && \
  npm install --omit=dev
COPY . .
RUN npm run build

FROM kasmweb/chrome:1.13.1
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD [ "curl", "http://localhost:3000" ]
ENV APP_ARGS '--remote-debugging-port=16666 --start-maximized --disable-notifications --password-store=basic --disable-save-password-bubble --disable-features=Translate'
USER root

RUN apt-get update && \
  apt-get install -y nodejs npm libopencv-dev && \
  npm install -g n && \
  n 18.17.0 && \
  apt-get clean autoclean && rm -rf /var/lib/{apt,dpkg,cache,log}/

RUN apt-get update && \
  apt-get install -y libxtst-dev xorg-dev libpng-dev netcat && \
  chown -R 1000:1000 /home/kasm-user && \
  mkdir -p /bipbop && \
  mkdir -p /etc/opt/chrome/policies/managed && \
  echo '{"PasswordManagerEnabled": false}' > /etc/opt/chrome/policies/managed/disable_password_manager.json && \
  mkdir -p /var/log/chrome && \
  apt-get clean autoclean && rm -rf /var/lib/{apt,dpkg,cache,log}/

COPY ./docker/supervisor/ /etc/supervisor/conf.d
COPY --from=builder /build/dist-packages /bipbop/
RUN cd /bipbop && npx build-opencv --incDir /usr/include/opencv4/ --libDir /lib/x86_64-linux-gnu/ --binDir=/usr/bin/ --nobuild rebuild
COPY --from=builder /build/dist /bipbop/
COPY ./docker/init/ /init/

ENTRYPOINT []
CMD ["/usr/bin/supervisord", "--nodaemon"]
