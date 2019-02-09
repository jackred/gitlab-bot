here=`pwd`

if [ $# -ne 0 ];
then
    if [ $1 = "debug" ];
    then
    sudo docker run --rm -v $here/config.json:/usr/src/gitlab-bot-build/config.json --log-opt max-size=10m -it --name gitlab-bot gitlab-bot
    else
	echo "wrong argument"
    fi
else
    sudo docker run -v $here/config.json:/usr/src/gitlab-bot-build/config.json --log-opt max-size=10m --restart always -dit --name gitlab-bot gitlab-bot
fi
 

