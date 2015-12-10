/*global angular google componentHandler $*/
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
}).directive("oDrawer",function(){
  var deferScrollRecalc=null;
  return {
    priority: 0,
    restrict: 'A',
    scope: false,
    link: function oDrawerPostLink(scope, iElement, iAttrs) {
      iElement.parent().on("scroll.oDrawer",function (e){
        if (deferScrollRecalc!=null){
          clearTimeout(deferScrollRecalc);
        }
        deferScrollRecalc=setTimeout(function(){
          deferScrollRecalc=null;
          if ($(e.target).scrollTop()>0){
            var prev=parseInt(iElement.css("height"));
            iElement.css({top:'-'+(prev-8)+'px'});
          }else{
            iElement.css({top:""});
          }
        },400);
      });
    }
  }
}).controller("oOutcomes",["$scope",'$rootScope',function($scope,$root){
  /*----------*/
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
  function checkDrawer(){
    if ($scope.overallAmount()>0){
      $root.drawer.show=true;
    }
    else{
      $root.drawer.show=false;
    }
  }
  function loadCategorySuccess(answer){
    if (answer.result===0){
      $scope.categories[answer.data[0].id]=answer.data[0];
      checkDrawer();

    }else{
      showError(answer.data);
    }
    $scope.$apply();
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

    }else{
      showError(answer.data);
    }
    $scope.$apply();
  }
  /*----------*/
  $scope.state={sum:0,stage:'categories',fin:null,category:null};
  $scope.categories={};
  $root.shutter.loading=false;
  /*----------*/
  $scope.overallAmount=function overallAmount(){
    var sum=0;
    for (var catId in $scope.categories){
      var pInt=parseInt($scope.categories[catId].amount);
      sum+=pInt!=null && !isNaN(pInt)?pInt:0;
    }
    return sum;
  }
  /*----------*/
  this.spendOnCategory=function spendOnCategory(category,amount){
    amount=parseInt(amount);
    if (amount>0){
      google.script.run.withSuccessHandler(loadCategorySuccess).spendOnCategory(category.idx,amount);
    }
  }
  this.checkOut=function checkOut(){
    if ($scope.overallAmount()>0){
      google.script.run.withSuccessHandler(loadCategoriesSuccess).checkOut();
    }
  }

  this.clearCategoryAmount=function clearCategoryAmount(category){
    if (category!=null){
      google.script.run.withSuccessHandler(loadCategorySuccess).clearCategoryAmount(category.idx);
    }else{
      google.script.run.withSuccessHandler(loadCategoriesSuccess).clearCategoryAmount();
    }

  }
   google.script.run.withSuccessHandler(loadCategoriesSuccess).loadCategories();

}]);
