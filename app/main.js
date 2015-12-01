/*global angular */
angular.module("oAccount",["ngAnimate"]).controller("oOutcomes",["$scope",'$rootScope',function($scope,$root){
  $root.loaded=true;
  this.categories={first:{name:'Cat1'},second:{name:'Cat2'}};
  this.selected={category:null,sum:null}
  this.setCategory=function setCategory(catID){
    this.selected.category=catID;
    this.selected.sum=0;
  }
}]);
