export const docker = {
  stage: {
    container_name: 'reports',
    image: 'joseluisq/static-web-server:2',
    volumes: ['/srv/projects/pw-yesjo:/public'],
    environment: ['SERVER_PORT=3000', 'SERVER_ROOT=/public', 'SERVER_DIRECTORY_LISTING=true'],
    restart: 'unless-stopped',
    labels: [
      'traefik.enable=true',
      'traefik.http.routers.playwright-report.rule=Host(`pw.${DOMAIN}`)',
      'traefik.http.routers.playwright-report.entrypoints=websecure',
      'traefik.http.routers.playwright-report.tls.certresolver=letsencryptResolver',
      'traefik.http.services.playwright-report.loadbalancer.server.port=3000',
    ],
  },
}
