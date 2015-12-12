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
}).factory("oModalSvc", ["$rootScope","$q","$templateRequest","$compile",function oModalSvc($root,$q,$tpl,$compile){
  oModalPromise.view=null;
  var q=null;
  function oModalPromise(options){
    if (oModalPromise.view==null) console.warning('oModalSvc: No view directive registered');
    if (q!=null) console.warning('oModalSvc: Already active');
    if (options.template==null) throw new Error("oModalSvc: template required");
    var template=$tpl(options.template);
    var scope=$root.$new(true);
    oModalPromise.view.append(template);
    $compile(template)(scope);
    if (options.scope!=null){
      angular.extend(scope,options.scope);
    }
    scope.$close=function(message){
      oModalPromise.view.empty();
      scope.$destroy();
      q.resolve(message);
      q=null;
    };
    q=$q.defer();
    return q.promise;
  }
  return oModalPromise;
}]).directive("oView",['oModalSvc',function(oModalSvc){
  return {
    priority: 0,
    restrict: 'EA',
    scope: false,
    link: function oViewPostLink(scope, iElement, iAttrs) {
      oModalSvc.view=iElement;
    }
  };
}])
.directive("oDrawer",function(){
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
  function recalcOverallAmount(){
    $scope.overallIncome=0;
    $scope.overallOutcome=0;
    for (var catId in $scope.categories){
      var pInt=parseInt($scope.categories[catId].amount);
      if (!isNaN(pInt)){
        if($scope.categories[catId].type==1){
          $scope.overallIncome+=pInt;
        }else {
          $scope.overallOutcome+=pInt;
        }
      }
    }
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
  function checkDrawer(){
    recalcOverallAmount();
    if ($scope.overallIncome>0||$scope.overallOutcome>0){
      $root.drawer.show=true;
    }
    else{
      $root.drawer.show=false;
    }
  }
  function genericFailure(error){
    showError(error.message);
  }

  function loadAppStateSuccess(answer){
    if (answer.result===0){
      $scope.categories=answer.data.categories.reduce(
        function(p,n){
          p[n.id]=n;
          return p;
        }
        ,{});
      checkDrawer();
      $scope.contractors=answer.data.contractors.reduce(
        function(p,n){
          p[n.id]=n;
          return p;
        }
        ,{});
      $root.contractors=$scope.contractors;

    }else{
      showError(answer.data);
    }
    $scope.$apply();
  }
  /*----------*/
  $scope.state={sum:0,stage:'categories',fin:null,category:null};
  $scope.categories={};
  $scope.contractors={};
  $scope.overallIncome=0;
  $scope.overallOutcome=0;
  $root.shutter.loading=false;
  /*----------*/

  /*----------*/
  this.spendOnCategory=function spendOnCategory(category,amount){
    amount=parseInt(amount);
    if (amount>0){
      google.script.run.withSuccessHandler(loadAppStateSuccess).spendOnCategory(category.idx,amount);
    }
  }
  this.checkOut=function checkOut(){
    if ($scope.overallAmount()>0){
      google.script.run.withSuccessHandler(loadAppStateSuccess).checkOut();
    }
  }

  this.clearCategoryAmount=function clearCategoryAmount(category){
    if (category!=null){
      google.script.run.withSuccessHandler(loadAppStateSuccess).clearCategoryAmount(category.idx);
    }else{
      google.script.run.withSuccessHandler(loadAppStateSuccess).clearCategoryAmount();
    }

  }
   google.script.run.withFailureHandler(genericFailure).withSuccessHandler(loadAppStateSuccess).loadAppState();

}]);
