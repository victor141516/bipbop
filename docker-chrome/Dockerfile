FROM ubuntu

RUN apt-get update && \
  apt-get install -y xvfb wget && \
  wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O chrome.deb && \
  apt-get install -y ./chrome.deb && \
  rm chrome.deb

RUN mkdir -p /var/run/dbus/
RUN useradd --create-home user 
USER user
COPY init.sh init.sh
CMD [ "./init.sh" ]
