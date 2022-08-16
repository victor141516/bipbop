# FROM kasmweb/chrome

# USER root

# RUN apt-get update && \
#   apt-get install -y xvfb wget && \
#   wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O chrome.deb && \
#   apt-get install -y ./chrome.deb && \
#   rm chrome.deb

# RUN useradd --create-home user 
# COPY init.sh init.sh
# CMD [ "./init.sh" ]


FROM kasmweb/chrome:develop
EXPOSE 16667
USER root
RUN apt-get update && apt-get install -y socat
ENV APP_ARGS '--remote-debugging-port=16666 --remote-debugging-address=0.0.0.0'
USER 1000

# somehow run `socat TCP-LISTEN:16667,reuseaddr,fork TCP:127.0.0.1:16666` in the background
# run the container with `docker run --rm -it --shm-size=512m -p 6901:6901 -p 16667:16667 -e APP_ARGS='--remote-debugging-port=16666 --remote-debugging-address=0.0.0.0' -e VNC_PW=password the-image`