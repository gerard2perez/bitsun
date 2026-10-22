export const docker = {
  base: {
    container_name: 'postgres',
    image: 'postgres:16',
    restart: 'always',
    environment: undefined,
    healthcheck: undefined,
    volumes: ['pg-data:/var/lib/postgresql/data'],
    ports: ['5432:5432'],
    networks: [],
  },
  local: {
    // uses: ['base'],
  },
  stage: {
    // uses: ['base'],
    // secrets: ['db-main-password'],
    // healthcheck: {
    //   test: ['CMD-SHELL', 'pg_isready -U postgres'],
    //   interval: '10s',
    //   timeout: '5s',
    //   retries: 5,
    // },
    // networks: ['shared-network'],
  },
  prod: {
    uses: ['stage'],
  },
  e2e: {
    uses: ['base'],
    healthcheck: {
      test: ['CMD-SHELL', 'pg_isready -U postgres -d bakery'],
      interval: '2s',
      timeout: '5s',
      retries: 15,
    },
  },
}

export const env = {
  POSTGRES_USER: 'postgres',
  POSTGRES_DB: 'bakery',
  POSTGRES_PORT: '5432',
  POSTGRES_HOST: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
}

export const _volumes = ['pg-data']
