'use strict';

angular.module('calenderApp')
  .directive('calender', ['$http', 'Auth', function ($http, Auth) {
    return {
      templateUrl: 'components/calender/calender.html',
      restrict: 'EA',
      link: function (scope) {
        scope.currentMonthCount = 0;
        scope.userName = Auth.getCurrentUser().name;
        scope.today = new Date();
        scope.monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'Sepember', 'October', 'November', 'December'];
        scope.dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        scope.currentMonth = new Date().getMonth();
        scope.currentYear = new Date().getFullYear();
        scope.currentDate = new Date().getDate();
        scope.empData = [];
        scope.selectedUsers = [scope.userName];
        scope.leaveTypes = [{name: "Present", value: ""}, {name: "Vacation", value: "V"}, {name: "Public Holiday", value: "P"}, {name: "Training", value: "T"}];
        scope.todayAMRegistered = false;
        scope.todayPMRegistered = false;
        scope.serverMessage = {};
        scope.showAlert = false;
        scope.leaveTodayAM = '';
        scope.leaveTodayPM = '';
        scope.fromDate = new Date(scope.currentYear, scope.currentMonth, scope.currentDate);
        scope.toDate = new Date(scope.currentYear, scope.currentMonth, scope.currentDate);
        scope.plannedFrom = 'AM';
        scope.plannedTo = 'PM';
        scope.plannedLeaveUnit = '';
        scope.plannedDates = [];
        scope.clashes = [];
        scope.clashNames = [];

        Auth.isLoggedInAsync(function (loggedIn) {
          scope.userName = Auth.getCurrentUser().name;
          scope.selectedUsers = [scope.userName];
        });

        //Get all days in provided month
        var getDaysInMonth = function (month, year) {
          var date = new Date(year, month, 1);
          var days = [];
          while (date.getMonth() === month) {
            if (date.getDay() != 6 && date.getDay() != 0) {
              days.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
          }
          return days;
        };

        //Watch for month change
        scope.$watch('currentMonth', function () {
          scope.currentMonthDays = getDaysInMonth(scope.currentMonth, scope.currentYear);
        });


        //Goto Today
        scope.showToday = function () {
          scope.currentMonthCount = 0;
          scope.currentMonth = scope.today.getMonth();
          scope.currentYear = scope.today.getFullYear();
        };

        //Goto Previous Month
        scope.previousMonth = function () {
          --scope.currentMonthCount;
          if (scope.currentMonth > 0) {
            --scope.currentMonth;
          } else {
            --scope.currentYear;
            scope.currentMonth = 11;
          }
        };

        //Goto Next Month
        scope.nextMonth = function () {
          ++scope.currentMonthCount;
          if (scope.currentMonth < 11) {
            ++scope.currentMonth;
          } else {
            ++scope.currentYear;
            scope.currentMonth = 0;
          }
        };

        //Fetch Data from CSV
        $http.get('assets/data/data.csv').success(function (data) {
          var csvData = CSVToArray(data);
          for (var i = 1; i < csvData.length; ++i) {
            if (typeof scope.empData[csvData[i][0]] === 'undefined') {
              scope.empData[csvData[i][0]] = {};
              scope.empData[csvData[i][0]]['userid'] = csvData[i][0];
              scope.empData[csvData[i][0]]['name'] = csvData[i][1];
              scope.empData[csvData[i][0]]['log'] = [];
            }
            var DATE = csvData[i][2].split('/');
            var date = new Date(DATE[2], DATE[0] - 1, DATE[1]);
            var log = {
              date: date,
              unit: csvData[i][3],
              value: csvData[i][4]
            };
            scope.empData[csvData[i][0]]['log'].push(log);
          }
        });

        //Checkbox Toggle
        scope.toggleSelection = function toggleSelection(userName) {
          var idx = scope.selectedUsers.indexOf(userName);

          // is currently selected
          if (idx > -1) {
            scope.selectedUsers.splice(idx, 1);
          }

          // is newly selected
          else {
            scope.selectedUsers.push(userName);
          }

          scope.checkClashes();
        };

        //Set Today's AM log
        scope.setTodayLeaveAM = function () {
          //Server Request
          scope.serverMessage = {today: scope.leaveTodayAM, unit: 'AM', id: Auth.getCurrentUser()._id};
          scope.todayAMRegistered = true;
          scope.showAlert = true;
        };

        //Set Today's PM log
        scope.setTodayLeavePM = function () {
          //Server Request
          scope.serverMessage = {today: scope.leaveTodayAM, unit: 'PM', id: Auth.getCurrentUser()._id};
          scope.todayPMRegistered = true;
          scope.showAlert = true;
        };

        //Hide Alert
        scope.hideAlert = function () {
          scope.showAlert = false;
        };

        //Save Planned Leave
        scope.savePlannedLeave = function () {
          //Server Request
          scope.serverMessage = {fromDate: scope.fromDate, toDate: scope.toDate, fromUnit: scope.plannedFrom, toUnit: scope.plannedTo, value: scope.plannedLeaveUnit, id: Auth.getCurrentUser()._id};
          scope.showAlert = true;
          var dates = getDates(scope.fromDate, scope.toDate);
          scope.plannedDates = dates;
          for (var i = 0; i < scope.empData.length; ++i) {
            if (scope.empData[i]) {
              if (scope.empData[i].name === scope.userName) {
                for (var k = 0; k < scope.empData[i]['log'].length; ++k) {
                  for (var l = 0; l < dates.length; ++l) {
                    scope.empData[i]['log'].splice(scope.empData[i]['log'].indexOf(dates[l]), 1);
                  }
                }
                for (var j = 0; j < dates.length; ++j) {
                  if ((scope.plannedFrom == 'PM' && j == 0)) {
                    scope.empData[i]['log'].push({date: dates[j], unit: scope.plannedFrom, value: scope.plannedLeaveUnit, planned: true});
                  } else if ((scope.plannedTo == 'AM' && j == dates.length - 1)) {
                    scope.empData[i]['log'].push({date: dates[j], unit: scope.plannedTo, value: scope.plannedLeaveUnit, planned: true});
                  } else {
                    scope.empData[i]['log'].push({date: dates[j], unit: 'AM', value: scope.plannedLeaveUnit, planned: true});
                    scope.empData[i]['log'].push({date: dates[j], unit: 'PM', value: scope.plannedLeaveUnit, planned: true});
                  }
                }
                break;
              }
            }
          }
          scope.checkClashes();
        };

        scope.checkClashes = function () {
          var clash = [];
          var parsedDates = [];
          for (var ii = 0; ii < scope.plannedDates.length; ++ii) {
            parsedDates.push(scope.plannedDates[ii].getTime());
            parsedDates.push(scope.plannedDates[ii].subtractDays(4).getTime());
          }
          for (var i = 0; i < scope.empData.length; ++i) {
            if (scope.empData[i]) {
              if (scope.empData[i].name != scope.userName && scope.selectedUsers.indexOf(scope.empData[i].name) > -1) {
                for (var j = 0; j < scope.empData[i]['log'].length; ++j) {
                  if (parsedDates.indexOf(scope.empData[i]['log'][j]['date'].getTime())) {
                    if (typeof scope.clashes[scope.empData[i].name] == 'undefined') {
                      scope.clashes[scope.empData[i].name] = {};
                      scope.clashes[scope.empData[i].name] = {data: []};
                    }
                    scope.clashes[scope.empData[i].name]['data'].push(scope.empData[i]['log'][j]);
                  }
                  if (scope.clashNames.indexOf(scope.empData[i].name) < 0) {
                    scope.clashNames.push(scope.empData[i].name);
                  }
                }
              }
            }
          }
          console.log(scope.clashes)
        };


        function getDates(startDate, stopDate) {
          var dateArray = [];
          var currentDate = startDate;
          while (currentDate <= stopDate) {
            if (new Date(currentDate).getDay() != 0 && new Date(currentDate).getDay() != 6) {
              dateArray.push(new Date(currentDate));
            }
            currentDate = currentDate.addDays(1);
          }
          return dateArray;
        }
      }
    }
  }]);


Date.prototype.addDays = function (days) {
  var dat = new Date(this.valueOf());
  dat.setDate(dat.getDate() + days);
  return dat;
};

Date.prototype.subtractDays = function (days) {
  var dat = new Date(this.valueOf());
  dat.setDate(dat.getDate() - days);
  return dat;
};





