home=`pwd`

sudo docker run --network gitlab-bot-network -v $home/config.json:/usr/src/gitlab-bot-build/config.json --log-opt max-size=10m --restart always -dit --name gitlab-bot gitlab-bot
