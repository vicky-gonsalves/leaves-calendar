'use strict';

angular.module('calenderApp')
    .controller('MainCtrl', function ($scope, $http, socket, Auth, $location) {
        $scope.ifLoggedIn = false;
        Auth.isLoggedInAsync(function (loggedIn) {
            if (!loggedIn) {
                $location.path('/login');
            }
            $scope.ifLoggedIn = loggedIn;
        });
    });
