var socket;
var app = angular.module("RunAdmin", ['ngTouch','ngAnimate', 'ui.bootstrap', 'ui.bootstrap.datetimepicker', 'pascalprecht.translate', 'ngCookies']).controller('RunAdminController', ['$scope', '$http', '$log', '$location', function ($scope, $http, $log, $location) {
        $scope.competitionId = competitionId

        updateRunList();
        launchSocketIo();

        var runListTimer = null;
        var runListChanged = false;


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
                socket.emit('subscribe', 'runs/line/' + competitionId)
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
        $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })

        $http.get("/api/competitions/" + competitionId +
            "/LineNL/teams").then(function (response) {
            $scope.teams = response.data
            $http.get("/api/competitions/" + competitionId +
                "/LineWL/teams").then(function (response) {
                $scope.teams = $scope.teams.concat(response.data)
            })
        })

        $http.get("/api/competitions/" + competitionId +
            "/LineNL/rounds").then(function (response) {
            $scope.rounds = response.data
            $http.get("/api/competitions/" + competitionId +
                "/LineWL/rounds").then(function (response) {
                $scope.rounds = $scope.rounds.concat(response.data)
            })
        })

        $http.get("/api/competitions/" + competitionId +
            "/LineNL/fields").then(function (response) {
            $scope.fields = response.data
            $http.get("/api/competitions/" + competitionId +
                "/LineWL/fields").then(function (response) {
                $scope.fields = $scope.fields.concat(response.data)
            })
        })

        $http.get("/api/competitions/" + competitionId +
            "/Line/maps").then(function (response) {
            $scope.maps = response.data
        })

        $scope.addRun = function () {
            if ($scope.run === undefined ||
                $scope.run.round === undefined ||
                $scope.run.team === undefined ||
                $scope.run.map === undefined ||
                $scope.run.field === undefined) {
                return
            }

            var run = {
                round: $scope.run.round._id,
                team: $scope.run.team._id,
                field: $scope.run.field._id,
                map: $scope.run.map._id,
                competition: competitionId,
                startTime: $scope.startTime.getTime()
            }

            //console.log(run)

            $http.post("/api/runs/line", run).then(function (response) {
                console.log(response)
                updateRunList()
            }, function (error) {
                console.log(error)
                swal("Oops!", error.data.err, "error");
            })
        }

        $scope.selectAll = function () {
            angular.forEach($scope.runs, function (run) {
                if($scope.list_filter(run)) run.checked = true;
            });
        }

        $scope.removeSelectedRun = function () {
            var chk = [];
            angular.forEach($scope.runs, function (run) {
                if (run.checked) chk.push(run._id);
            });
            $scope.removeRun(chk.join(","));
        }

        $scope.removeRun = async function (runIds) {
            const {
                value: operation
            } = await swal({
                title: "Delete Run?",
                text: "Are you sure you want to remove the run?",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete it!",
                confirmButtonColor: "#ec6c62",
                input: 'text',
                inputPlaceholder: 'Enter "DELETE" here',
                inputValidator: (value) => {
                    return value != 'DELETE' && 'You need to write "DELETE" !'
                }
            })

            if (operation) {
                $http.delete("/api/runs/line/" + runIds).then(function (response) {
                    console.log(response)
                    updateRunList()
                }, function (error) {
                    console.log(error)
                })
            }


        }
        var showAllRounds = true
        var showAllFields = true
        var showAllTeams = true
        $scope.teamName = ""

        $scope.$watch('Rrounds', function (newValue, oldValue) {
            showAllRounds = true
            //console.log(newValue)
            for (let round in newValue) {
                if (newValue.hasOwnProperty(round)) {
                    if (newValue[round]) {
                        showAllRounds = false
                        return
                    }
                }
            }
        }, true)
        $scope.$watch('Rfields', function (newValue, oldValue) {
            //console.log(newValue)
            showAllFields = true
            for (let field in newValue) {
                if (newValue.hasOwnProperty(field)) {
                    if (newValue[field]) {
                        showAllFields = false
                        return
                    }
                }
            }
        }, true)
        $scope.$watch('teamName', function (newValue, oldValue) {
            if (newValue == '') showAllTeams = true
            else showAllTeams = false
            return
        }, true)

        $scope.list_filter = function (value, index, array) {
            return (showAllRounds || $scope.Rrounds[value.round.name]) &&
                (showAllFields || $scope.Rfields[value.field.name]) && (showAllTeams || ~value.team.name.indexOf($scope.teamName))
        }
        
        function objectSort(object) {
        var sorted = {};
        var arr = [];
        for (key in object) {
            if (object.hasOwnProperty(key)) {
                arr.push(key);
            }
        }
        arr.sort();
        //arr.reverse();

        for (var i = 0; i < arr.length; i++) {
            sorted[arr[i]] = object[arr[i]];
        }
        return sorted;
    }


        function updateRunList() {
            $http.get("/api/competitions/" + competitionId +
                "/line/runs?populate=true").then(function (response) {
                var runs = response.data;
                for (let run of runs) {
                    if (!run.team) {
                        run.team = {
                            'name': ""
                        };
                    }
                }
                $scope.runs = runs;
                if (!$scope.Rrounds && !$scope.Rfields) {
                    var rounds = {}
                    var fields = {}
                    for (var i = 0; i < $scope.runs.length; i++) {
                        try {
                            var round = $scope.runs[i].round.name
                            if (!rounds.hasOwnProperty(round)) {
                                rounds[round] = false
                            }
                        } catch (e) {

                        }

                        try {
                            var field = $scope.runs[i].field.name

                            if (!fields.hasOwnProperty(field)) {
                                fields[field] = false
                            }
                        } catch (e) {

                        }


                    }

                    $scope.Rrounds = objectSort(rounds)
                    $scope.Rfields = objectSort(fields)
                }
            })
        }

        $scope.go_sign = function (runid) {
            swal({
                title: "Go sign page?",
                text: "Are you sure you want to go sign page?  If you click 'GO', the signatures will remove.",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "GO!",
                confirmButtonColor: "#ec6c62"
            }).then((result) => {
                if (result.value) {
                    $scope.go('/line/sign/' + runid + '/');
                }
            })
        }

        $scope.go_judge = function (runid) {
            swal({
                title: "Go judge page?",
                text: "Are you sure you want to go judge page?  If you click 'GO', the time and signatures will remove.",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "GO!",
                confirmButtonColor: "#ec6c62"
            }).then((result) => {
                if (result.value) {
                    $scope.go('/line/judge/' + runid + '/');
                }
            })
        }

        $scope.go_approval = function (runid) {
            swal({
                title: "Go approval page?",
                text: "Are you sure you want to go approval page?",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "GO!",
                confirmButtonColor: "#ec6c62"
            }).then((result) => {
                if (result.value) {
                    $scope.go('/line/approval/' + runid + '/');
                }
            })
        }
        
        $scope.set_kiosk = function (runid){
            $http.get("/api/kiosk/1/line_checkpoint/"+runid).then(function (response) {
                        
            }, function (response) {
                console.log("Error: " + response.statusText);
            });
        }
        
        $scope.reset_kiosk = function (runid){
            $http.get("/api/kiosk/1/NA").then(function (response) {
                        
            }, function (response) {
                console.log("Error: " + response.statusText);
            });
        }


        $scope.go = function (path) {
            path = path + '?return=' + window.location.pathname;
            window.location = path
        }

        $scope.format = "yyyy-MM-dd"


        var start = new Date(Date.now() + 1000 * 60 * 5)
        start.setMinutes(start.getMinutes() - start.getMinutes() % 5)
        start.setSeconds(0)
        start.setMilliseconds(0)


        $scope.startTime = start
        $scope.startDate = start

        $scope.startDatePopup = {
            opened: false
        }
        $scope.openStartDate = function () {
            $scope.startDatePopup.opened = true
        }
        $scope.updateStartTime = function () {
            $scope.startTime.setFullYear($scope.startDate.getFullYear())
            $scope.startTime.setMonth($scope.startDate.getMonth())
            $scope.startTime.setDate($scope.startDate.getDate())
            $scope.startTime.setSeconds(0)
            $scope.startTime.setMilliseconds(0)

            $scope.startDate.setHours($scope.startTime.getHours())
            $scope.startDate.setMinutes($scope.startTime.getMinutes())
            $scope.startDate.setSeconds(0)
            $scope.startDate.setMilliseconds(0)
        }

}])
    .directive("runsReadFinished", function ($timeout) {
        return function (scope, element, attrs) {
            if (scope.$last) {
                $('.refine').css("visibility", "visible");
                $('.loader').remove();
            }
        }
    })


$(window).on('beforeunload', function () {
    socket.emit('unsubscribe', 'competition/' + competitionId);
});
