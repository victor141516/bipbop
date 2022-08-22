#!/bin/sh

echo -n "Waiting for Chrome to be ready .."
for i in `seq 1 40`; do
  echo -n .
  sleep 1
  [ $i == 40 ] && echo " Timeout!" >&2; exit 1
  nc -z localhost 16666 && echo " Open." && break
done;

exec npm run start