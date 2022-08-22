#!/bin/sh

echo -n "Waiting for Chrome to be ready .."
for _ in `seq 1 40`; do 
  echo -n .
  sleep 0.25
  nc -z localhost 16666 && echo " Open." && exit
done; echo " Timeout!" >&2; exit 1

exec npm run start