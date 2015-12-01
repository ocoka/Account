/*global angular */
angular.module("oAccount",["ngAnimate"]).controller("oOutcomes",["$scope",'$rootScope',function($scope,$root){
  $scope.state={sum:0,stage:'categories',fin:null,category:null};
  $scope.categories={c1:{name:'Cat1'},c2:{name:'Cat2'},c3:{name:'Cat3'},c4:{name:'Cat4'}};
  $root.loaded=true;
}]);
