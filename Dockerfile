FROM base/archlinux

ADD . /app
WORKDIR /app
RUN /app/docker/configure_docker_image.sh
ENV VERSION=$VERSION

CMD /app/docker/docker-entrypoint.sh