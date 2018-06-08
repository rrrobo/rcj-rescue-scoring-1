var socket;

var app = angular.module("LineScore", ['ngTouch','datatables', 'ui.bootstrap', 'ngAnimate', 'pascalprecht.translate', 'ngCookies']);
app.controller("LineScoreController", function ($scope, $http, $sce) {
    $scope.competitionId = competitionId
    $scope.sortOrder = '-score'
    $scope.go = function (path) {
        window.location = path
    }

    var runListTimer = null;
    var runListChanged = false;
    $scope.top3 = true;
    $scope.time = 26;
    launchSocketIo()
    updateRunList(function () {
        setTimeout(function () {
            window.scrollTo(0, window.scrollY +
                document.getElementById("rank").getBoundingClientRect().top -
                50);
        }, 200)
    })
    if (get['autoscroll'] != undefined) {
        scrollpage()
    }

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })
    
    function updateTime(){
        $scope.time--;
        if($scope.time <= 0){
            if($scope.top3) $scope.time = 30;
            else $scope.time = 15;
            $scope.top3 = !$scope.top3;
        }
        $scope.$apply();
    }
    setInterval(updateTime, 1000);

    function updateRunList(callback) {
        $http.get("/api/competitions/" + competitionId +
            "/line/runs?populate=true").then(function (response) {
            var runs = response.data
            
            for(let run of runs){
                try{
                    var teamname = run.team.name.split(' ');
                    run.teamCode = teamname[0];
                    run.teamName = teamname[1];
                    for(let i = 2; i < teamname.length;i++){
                        run.teamName = run.teamName + " " + teamname[i];
                    }

                }
                catch(e){

                }
            }
            
            

            //console.log(runs)

            //$scope.nipponRuns = []
            //var nipponTeamRuns = {}
            $scope.worldRuns = []
            var worldTeamRuns = {}

            for (var i in runs) {
                var run = runs[i]
                run.LoPsNum = 0
                for (var j in run.LoPs) {
                    if (run.LoPs[j] == null) {
                        run.LoPs[j] = 0
                    }
                    run.LoPsNum += run.LoPs[j]
                }

                run.score = parseInt(run.score)

                if (run.status >= 2 || run.score != 0 || run.time.minutes != 0 ||
                    run.time.seconds != 0) {
                    //console.log(run)
                    /*if (run.team.league == "LineNL") {


                        if (nipponTeamRuns[run.team._id] === undefined) {
                            nipponTeamRuns[run.team._id] = {
                                team: {
                                    name: run.team.name,
                                    code: run.teamCode,
                                    name_only: run.teamName
                                },
                                runs: [run]
                            }
                        } else {
                            nipponTeamRuns[run.team._id].runs.push(run)
                        }
                        var sum = sumBest(nipponTeamRuns[run.team._id].runs)
                        nipponTeamRuns[run.team._id].sumScore = sum.score
                        nipponTeamRuns[run.team._id].sumTime = sum.time
                        nipponTeamRuns[run.team._id].sumRescue = sum.rescued
                        nipponTeamRuns[run.team._id].sumLoPs = sum.lops
                        nipponTeamRuns[run.team._id].retired = sum.retired
                        if (run.status == 2 || run.status == 3) {
                            nipponTeamRuns[run.team._id].isplaying = true
                            run.isplaying = true
                        }
                        $scope.nipponRuns.push(run)

                    } else if (run.team.league == "LineWL") {*/
                        if (worldTeamRuns[run.team._id] === undefined) {
                            worldTeamRuns[run.team._id] = {
                                team: {
                                    name: run.team.name,
                                    code: run.teamCode,
                                    name_only: run.teamName
                                },
                                runs: [run]
                            }
                        } else {
                            worldTeamRuns[run.team._id].runs.push(run)
                        }
                        var sum = sumBest(worldTeamRuns[run.team._id].runs)
                        worldTeamRuns[run.team._id].sumScore = sum.score
                        worldTeamRuns[run.team._id].sumTime = sum.time
                        worldTeamRuns[run.team._id].sumRescue = sum.rescued
                        worldTeamRuns[run.team._id].sumLoPs = sum.lops
                        worldTeamRuns[run.team._id].retired = sum.retired
                        if (run.status == 2 || run.status == 3) {
                            worldTeamRuns[run.team._id].isplaying = true
                            run.isplaying = true
                        }
                        $scope.worldRuns.push(run)
                    //}
                }
            }
            //$scope.nipponRuns.sort(sortRuns)
            //$scope.worldRuns.sort(sortRuns)

            /*$scope.nipponRunsTop = []
            for (var i in nipponTeamRuns) {
                var teamRun = nipponTeamRuns[i]
                $scope.nipponRunsTop.push({
                    team: teamRun.team,
                    score: teamRun.sumScore,
                    time: teamRun.sumTime,
                    rescuedVictims: teamRun.sumRescue,
                    LoPsNum: teamRun.sumLoPs,
                    retired: teamRun.retired,
                    isplaying: teamRun.isplaying
                })
            }
            $scope.nipponRunsTop.sort(sortRuns)*/

            $scope.worldRunsTop = []
            for (var i in worldTeamRuns) {
                var teamRun = worldTeamRuns[i]
                $scope.worldRunsTop.push({
                    team: teamRun.team,
                    score: teamRun.sumScore,
                    time: teamRun.sumTime,
                    rescuedVictims: teamRun.sumRescue,
                    LoPsNum: teamRun.sumLoPs,
                    retired: teamRun.retired,
                    isplaying: teamRun.isplaying
                })
            }
            $scope.worldRunsTop.sort(sortRuns)

            if (callback != null && callback.constructor == Function) {
                callback()
            }
            var now = new Date();
            $scope.updateTime = now.toLocaleString();
        })
    }


    function timerUpdateRunList() {
        if (runListChanged) {
            updateRunList();
            runListChanged = false;
            runListTimer = setTimeout(timerUpdateRunList, 1000 * 15);
        } else {
            runListTimer = null
        }
    }

    function launchSocketIo() {
        // launch socket.io
        socket = io({
            transports: ['websocket']
        }).connect(window.location.origin)
        socket.on('connect', function () {
            socket.emit('subscribe', 'runs/line/'+ competitionId)
        })
        socket.on('changed', function () {
            runListChanged = true;
            if (runListTimer == null) {
                updateRunList();
                runListChanged = false;
                runListTimer = setTimeout(timerUpdateRunList, 1000 * 15)
            }
        })
    }


    function sumBest(runs) {
        if (runs.length == 1) {
            return {
                score: runs[0].score,
                time: runs[0].time,
                rescued: runs[0].rescueOrder.length,
                lops: runs[0].LoPsNum
            }
        }

        runs.sort(sortRuns)

        let sum = {
            score: 0,
            time: {
                minutes: 0,
                seconds: 0
            },
            rescued: 0,
            lops: 0
        }

        for (let i = 0; i < Math.min(9, runs.length); i++) {
            sum.score += runs[i].score
            sum.time.minutes += runs[i].time.minutes
            sum.time.seconds += runs[i].time.seconds
            sum.rescued += runs[i].rescueOrder.length
            sum.lops += runs[i].LoPsNum
        }
        sum.time.minutes += Math.floor(sum.time.seconds/60);
        sum.time.seconds %= 60;

        return sum
    }


    function BestScore(runs) {
        if (runs.length == 1) {
            return runs[0]
        }

        runs.sort(sortRuns)
        if (runs[0].score > runs[1].score) {
            return runs[0]
        } else if (runs[0].score < runs[1].score) {
            return runs[1]
        } else {
            if (runs[0].time.minutes > runs[1].time.minutes) {
                return runs[1]
            } else if (runs[0].time.minutes == runs[1].time.minutes) {
                if (runs[0].time.seconds > runs[1].time.seconds) {
                    return runs[1]
                } else {
                    return runs[0]
                }
            } else {
                return runs[0]
            }
        }


        return {
            score: runs[0].score + runs[1].score,
            time: {
                minutes: runs[0].time.minutes + runs[1].time.minutes +
                    (runs[0].time.seconds + runs[1].time.seconds >= 60 ? 1 : 0),
                seconds: (runs[0].time.seconds + runs[1].time.seconds) % 60
            }
        }
    }

    function sortRuns(a, b) {
        //console.log(a);
        //console.log(b);
        if (a.score == b.score) {
            if (a.retired && !b.retired) return 1
            else if (!a.retired && b.retired) return -1
            else if (a.retired && b.retired) {} else if (a.time.minutes < b.time.minutes) {
                return -1
            } else if (a.time.minutes > b.time.minutes) {
                return 1
            } else if (a.time.seconds < b.time.seconds) {
                return -1
            } else if (a.time.seconds > b.time.seconds) {
                return 1
            }
            if (a.rescuedVictims > b.rescuedVictims) {
                return -1
            } else if (a.rescuedVictims < b.rescuedVictims) {
                return 1
            }
            if (a.LoPsNum < b.LoPsNum) {
                return -1
            } else if (a.LoPsNum > b.LoPsNum) {
                return 1
            } else {
                return 0
            }
        } else {
            return b.score - a.score
        }
    }

    $scope.detail = function (row) {
        //console.log(row);
    }
});



// HAX
function scrollpage() {
    var i = 1,
        status = 0,
        speed = 1,
        period = 15

    function f() {
        window.scrollTo(0, window.scrollY +
            document.getElementById("allRuns").getBoundingClientRect().top -
            50 + i);
        if (status == 0) {
            i = i + speed;
            if (document.getElementById("allRuns").getBoundingClientRect().bottom <
                Math.max(document.documentElement.clientHeight, window.innerHeight ||
                    0)) {
                status = 1;
                return setTimeout(f, 1000);
            }
        } else {
            i = i - speed;
            if (document.getElementById("allRuns").getBoundingClientRect().top > 50) {
                status = 0;
                return setTimeout(f, 1000);
            }
        }
        setTimeout(f, period);
    }

    f();
}

$(window).on('beforeunload', function () {
    socket.emit('unsubscribe', 'runs/line');
});
