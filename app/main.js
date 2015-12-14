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
    if (oModalPromise.view==null) {
      throw new Error('oModalSvc: No view directive registered');
    }
    if (q!=null) throw new Error('oModalSvc: Already active');
    if (options.template==null) throw new Error("oModalSvc: template required");
    var template=null;
    var scope=$root.$new(true);
    $tpl(options.template).then(function(tpl){template=angular.element(tpl);
      oModalPromise.view.append(template);
      $compile(template)(scope);
    },function(data){
      console.log(data);
    });
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
}).controller("oOutcomes",["$scope",'$rootScope',"oModalSvc",function($scope,$root,oModalSvc){

  /*----------*/
  function recalcOverallAmount(){
    $scope.overallIncome=0;
    $scope.overallOutcome=0;
    $scope.categories.forEach(function(cat){
      var pInt=parseInt(cat.amount);
      if (!isNaN(pInt)){
        cat.amount=pInt;
        if(cat.type==1){
          $scope.overallIncome+=pInt;
        }else {
          $scope.overallOutcome+=pInt;
        }
      }else{
        cat.amount=0;
      }
    });
  }

  function showError(text){
    $root.shutter.loading=false;
    $root.shutter.message.isError=true;
    $root.shutter.message.text=text;
    $root.shutter.show=true;
  }
  function showLoading(){
    clearError();
    $root.shutter.loading=true;
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
    $scope.$apply();
  }

  function loadAppStateSuccess(answer){
    if (answer.result===0){
      if (answer.data.categories!=null){
        $scope.categories=answer.data.categories;
        checkDrawer();
      }
      if (answer.data.contractors!=null){
        $scope.contractors=answer.data.contractors;
      }
    }else{
      showError(answer.data);
    }
    $root.shutter.loading=false;
    $scope.$apply();
  }
  /*----------*/
  $scope.state={stage:'categories'};
  $scope.categories=[];
  $scope.contractors=[];
  $scope.overallIncome=0;
  $scope.overallOutcome=0;
  $scope.operationDate=new Date();

  /*----------*/

  /*----------*/
  this.spendOnCategory=function spendOnCategory(category,amount){
    amount=parseInt(amount);
    if (amount>0){
      category.amount+=amount;
    }
    checkDrawer();
  }

  this.checkOut=function checkOut(){
    recalcOverallAmount();
      if ($scope.overallIncome>0){
          oModalSvc({template:"modal.jade",scope:{contractors:$scope.contractors}}).then(function(result){
              if (result!=null){
                var preparedData=[];
                $scope.categories.forEach(function(cat){
                  if (cat.type==1 && cat.amount>0){
                    preparedData.push({id:cat.id,amount:cat.amount});
                  }
                });
                  showLoading();
                  google.script.run.withFailureHandler(genericFailure).withSuccessHandler(loadAppStateSuccess).checkOut($scope.operationDate.toISOString(),preparedData,result.id);
              }
          });
      }else if($scope.overallOutcome>0){
        var preparedData=[];
        $scope.categories.forEach(function(cat){
          if (cat.type==-1 && cat.amount>0){
            preparedData.push({id:cat.id,amount:cat.amount});
          }
        });
        var avalContractors=$scope.contractors.filter(function(con){return (con.current!=0 && con.type==-1 || con.type==1)});
        if (avalContractors.length>0){
          oModalSvc({template:"modal.jade",scope:{contractors:avalContractors}}).then(function(result){
              if (result!=null){
                showLoading();
                google.script.run.withFailureHandler(genericFailure).withSuccessHandler(loadAppStateSuccess).checkOut($scope.operationDate.toISOString(),preparedData,result.id);
              }
            });
        }else{
          showLoading();
          google.script.run.withFailureHandler(genericFailure).withSuccessHandler(loadAppStateSuccess).checkOut($scope.operationDate.toISOString(),preparedData,null);
        }
      }
      //google.script.run.withSuccessHandler(loadAppStateSuccess).checkOut();

  }

  this.clearCategoryAmount=function clearCategoryAmount(category){
    if (category!=null){
      category.amount=0;
    }else{
      $scope.categories.forEach(function(cat){
        cat.amount=0;
      });
    }
    checkDrawer();
  }

   google.script.run.withFailureHandler(genericFailure).withSuccessHandler(loadAppStateSuccess).loadAppState();

}]);
