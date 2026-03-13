# 📈 Statva

> Statistics about Strava rides, mostly

## Install

```bash
$ npm install
```

Fill in the `.env.local` file using provided `.env.dist`

```bash
$ cp .env.dist .env.local
```

## Run

```bash
$ npm run dev
```

Uses local JSON data by default. To fetch from the real Strava API:

```bash
$ npm run dev -- --mode production
```

## Build

```bash
$ npm run build
```
