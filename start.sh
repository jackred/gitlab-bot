here=`pwd`
src="/usr/src/gitlab-bot-build/"

if [ $# -ne 0 ];
then
    if [ $1 = "debug" ];
    then
    sudo docker run --rm -v $here/config.json:$src/config.json -v $here/gitlab.json:$src/gitlab.json --log-opt max-size=10m -it --name gitlab-bot gitlab-bot
    else
	echo "wrong argument"
    fi
else
    sudo docker run -v $here/config.json:$src/config.json -v $here/gitlab.json:$src/gitlab.json --log-opt max-size=10m --restart always -dit --name gitlab-bot gitlab-bot
fi
 

