FROM base/archlinux

ADD . /app
WORKDIR /app
RUN /app/docker/install_packages.sh
ENV VERSION=$VERSION

CMD gunicorn --bind 0.0.0.0:$PORT app:app