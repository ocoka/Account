/*global angular google componentHandler*/
angular.module("oAccount",["ngAnimate"]).run(['$rootScope',function($root){
  $root.shutter={loading:true,show:false,message:{isError:false,text:''}};
  $root.drawer={show:false};
}]).directive("oMdl",function(){
  return {
    priority: 0,
    restrict: 'A',
    scope: false,
    link: function oMdlPostLink(scope, iElement, iAttrs) {
      componentHandler.upgradeElement(iElement.get(0));
    }
  }
}).controller("oOutcomes",["$scope",'$rootScope',function($scope,$root){

  this.spendOnCategory=function spendOnCategory(category,amount){
    amount=parseInt(amount);
    if (amount>0){
      google.script.run.withSuccessHandler(saveCategorySuccess).spendOnCategory(category.idx,amount);
    }
  }
  $scope.state={sum:0,stage:'categories',fin:null,category:null};
  $scope.categories={};
  $root.shutter.loading=false;
  $scope.overallAmount=function overallAmount(){
    var sum=0;
    for (var catId in $scope.categories){
      var pInt=parseInt($scope.categories[catId].amount);
      sum+=pInt!=null && !isNaN(pInt)?pInt:0;
    }
    return sum;
  }
  function showError(text){
    $root.shutter.message.isError=true;
    $root.shutter.message.text=text;
    $root.shutter.show=true;
  }
  function clearError(){
    $root.shutter.message.isError=false;
    $root.shutter.message.text="";
    $root.shutter.show=false;
  }
  function loadCategoriesSuccess(answer){
    if (answer.result===0){
      $scope.categories=answer.data.reduce(
        function(p,n){
          p[n.id]=n;
          return p;
        }
        ,{});
      checkDrawer();
      $scope.$apply();
    }else{
      showError(answer.data);
    }
  }
  function checkDrawer(){
    if ($scope.overallAmount()>0){
      $root.drawer.show=true;
    }
    else{
      $root.drawer.show=false;
    }
  }
  function saveCategorySuccess(answer){
    if (answer.result===0){
      $scope.categories[answer.data[0].id]=answer.data[0];
      checkDrawer();
      $scope.$apply();
    }else{
      showError(answer.data);
    }
  }


   google.script.run.withSuccessHandler(loadCategoriesSuccess).loadCategories();

}]);
