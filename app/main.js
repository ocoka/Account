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
  var transactionId=null;
  /*----------*/
  function recalcTotalAmount(clear){
    $scope.totalRedSum=0;
    $scope.totalGreenSum=0;
    $scope.cardsBox[$scope.state.stage].forEach(function(cat){
      if (clear) {
        cat.amount=0;
        return true;
      }
      var pInt=parseInt(cat.amount);
      if (!isNaN(pInt)){
        cat.amount=pInt;
        if(cat.type==1){
          $scope.totalGreenSum+=pInt;
        }else {
          $scope.totalRedSum+=pInt;
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
  function checkDrawer(clear){
    recalcTotalAmount(clear);
    if ($scope.totalRedSum>0||$scope.totalGreenSum>0){
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
      if (answer.data.transactionId!=null){
        transactionId=answer.data.transactionId;
      }else{
        showError("No transaction identifier");
      }
      if (answer.data.categories!=null){
        $scope.cardsBox["categories"]=answer.data.categories;
      }
      if (answer.data.contractors!=null){
        $scope.cardsBox["contractors"]=answer.data.contractors;
      }
      checkDrawer();
    }else{
      showError(answer.data);
    }
    $root.shutter.loading=false;
    $scope.$apply();
  }
  /*----------*/
  $scope.state={stage:'categories'};
  $scope.stageRoutes=[{id:'categories',name:'Categories'},{id:'contractors',name:'Contractors'}]
  $scope.cardsBox={};
  $scope.totalRedSum=0;
  $scope.totalGreenSum=0;
  $scope.operationDate=new Date();

  /*----------*/

  /*----------*/
  this.addAmount=function addAmount(category,amount){
    amount=parseInt(amount);
    if (amount>0){
      category.amount+=amount;
    }
    checkDrawer();
  }

  this.checkOut=function checkOut(){
    recalcTotalAmount();
      if ($scope.totalRedSum>0||$scope.totalGreenSum>0){
        var preparedData=[];
        $scope.cardsBox[$scope.state.stage].forEach(function(cat){
          if (cat.amount>0){
            preparedData.push(cat);
          }
        });

        var avalContractors=[];
        switch($scope.state.stage){
            case 'contractors':
              avalContractors=$scope.cardsBox["contractors"].filter(function(con){return con.id!='con5'});
              break;
            case 'categories':
              avalContractors=$scope.cardsBox["contractors"].filter(function(con){return con.current>0});
              break;
            default:
              break;
        }


        if (avalContractors.length>1){
          oModalSvc({template:"modal.jade",scope:{contractors:avalContractors}}).then(function(result){
              if (result!=null){
                showLoading();
                google.script.run.withFailureHandler(genericFailure).withSuccessHandler(loadAppStateSuccess).checkOut(transactionId,$scope.state.stage,$scope.operationDate.toISOString(),preparedData,result.id);
              }
            });
        }else{
          showLoading();
          google.script.run.withFailureHandler(genericFailure).withSuccessHandler(loadAppStateSuccess).checkOut(transactionId,$scope.state.stage,$scope.operationDate.toISOString(),preparedData,avalContractors.length>0?avalContractors[0].id:null);
        }
      }
      //google.script.run.withSuccessHandler(loadAppStateSuccess).checkOut();

  }

  this.clearAmount=function clearAmount(category){
    if (category!=null){
      category.amount=0;
    }
    checkDrawer();
  }
  this.clearAllAmount=function clearAllAmount(){
    checkDrawer(true);
  }

  google.script.run.withFailureHandler(genericFailure).withSuccessHandler(loadAppStateSuccess).loadAppState();

}]);
