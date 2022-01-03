FROM node

WORKDIR /opt/lierc-basicui
RUN apt-get update && apt-get install -y cpanminus

RUN npm install -g handlebars
RUN cpanm -nq AnyEvent::Filesys::Notify Term::ANSIColor

CMD make watch
