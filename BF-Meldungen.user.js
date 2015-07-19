// ==UserScript==
// @name          BF-Meldungen
// @namespace     absolut-fair.com
// @description   Bessere Verwaltung der Meldungen - NUR FÜR MODERATOREN
// @include       http://forum.sa-mp.de/*
// @include       https://forum.sa-mp.de/*
// @include       http://ticket.sa-mp.de/scp/*
// @require       https://ajax.googleapis.com/ajax/libs/jquery/1.6.4/jquery.min.js
// @version       4.2.1.1
// @grant         unsafeWindow
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_xmlhttpRequest
// @grant         GM_info
// @grant         GM_setClipboard
// @grant         GM_addStyle
// @grant         GM_openInTab
// ==/UserScript==

var version=GM_info.script.version,popupStatus=0,secid = unsafeWindow.SECURITY_TOKEN,sid = unsafeWindow.SID_ARG_2ND;
var $_GET = getQueryParams(document.location.search),secid=secid+sid,hits,hits2,lastid;
var pagetype=0,prot="http",inhi_prof="",inhi_atmid = GM_getValue("inhi_lastid", 0),gagreflex = 0;
var bfalias,bfid;

exceptions=new Array("goraster","gohidestrike","defmodbook","goinhibitor");
for(var i=0;i<exceptions.length;i++) if(GM_getValue(exceptions[i],"error")=="error") GM_setValue(exceptions[i],0);
defval = new Array();
deftemplates();

this.$ = this.jQuery = jQuery.noConflict(true);
$(document).ready(function () { 
    var tstamp = Math.floor(new Date().getTime() / (1000*60));
	initpop();
	
    if( GM_getValue("lasttokenrefresh","0") < tstamp - 60*60 || GM_getValue("schnellmod_token","0")=="0" ) 
    {
        GM_xmlhttpRequest({
            method: "GET",
            url: "http://absolut-fair.com/sampde_admin/auth.php?s="+secid+"&token="+GM_getValue("schnellmod_token","0"),
            onload: function(response) {
                var resp = response.responseText;
                if(resp=="0") return openpop("Zugriffsfehler",'<textarea style="width:400px; height:150px;" readonly>Die Schnellmoderation ist lediglich für Moderatoren gedacht - also nicht für dich. Bitte deinstalliere Sie wieder.\n\nEin Umgehen dieser Sperre stört leider den Betriebsfluss und wird entsprechend sanktioniert!</textarea>',1);
                GM_setValue("lasttokenrefresh",tstamp);
                if(resp!=GM_getValue("schnellmod_token","0") || GM_getValue("schnellmod_token","0")=="0") 
                {
                    GM_setValue("schnellmod_token",resp);
                    location.reload();
                }
            }
        });
    }
	
	if( need_update(GM_getValue("lastvers",'0.0.0'),version) && GM_getValue("showupdate",1) == 1 ) 
	{
		openpop("Preiset den Herrn!", '<audio id="loop" autoplay><source src="http://absolut-fair.com/sampde_admin/halleluja.wav" type="audio/wav" /></audio><div style="text-align:center; width:100%; margin-bottom:25px; margin-top:25px;">Die Schnellmoderation wurde geupdated</div><input type="button" value="Changelog" id="showchangelog"><input type="button" value="Weiter" style="float:right;" id="skipupdate">', 1);
		if( GM_getValue("update_reset_templates",1) == 1 ) deftemplates(1); //reset der templates
		$("#showchangelog").click(function() { window.location=prot+"://forum.sa-mp.de/interne-bereiche/v-i-p/internes-forum/117796-trooper-s-schnellmoderation/last-post/"; });
		$("#skipupdate").click(function() { disablePopup(); });
	}
	GM_setValue("lastvers",version);

	if( $(location).attr('href').indexOf("http://ticket.sa-mp.de/scp/") != -1 && GM_getValue("go_tickethelper",1) == 1) //ticketsystem
	{
		var lasturl = "";
		var ticketcheckfunc = function() {
			if($(".ticket_info").length && !$(".insinfos").length && !$("#uinfo_load_div").length)
			{
				var name_a = $(".icon-user",".ticket_info").closest("a");
				$(name_a).bind("contextmenu",function(e){
					e.preventDefault();
					
					var inp = prompt("Bitte geben Sie den echten Benutzernamen ein:","");
					if(!inp.length) return;
					$(".insinfos").remove();
					$("span",name_a).text(inp);
					loadtickethelper();
				});
				loadtickethelper();
			}
		};
		ticketcheckfunc();
		setInterval(function() { ticketcheckfunc(); },500);
		return;
	}
	
	bfid = getbfid();
	if( GM_getValue("hidemod","1")==1) $("#userMenuModeration").remove();
	if( GM_getValue("goinhibitor",0)==1 )
	{
		$("#userMenu > ul").append('<li id="inhibitmenu"><a href="#" id="inhibit_act"><span>Inhibitor</span></a></li>');
		$("#inhibit_act").click(function(e) { e.preventDefault(); actinhi(); });
		
		if( GM_getValue("inhi_running",0)==1 ) actinhi( GM_getValue("inhi_id","" ) );
	}
	
	if( GM_getValue("checkticket",1) == 1)
	{
		$("#userMenu > ul").append('<li id="ticketsysmenu"><a href="http://ticket.sa-mp.de/scp/tickets.php" id="ticketsys_act" target="_new"><span>Tickets</span></a></li>');
		
		GM_xmlhttpRequest({
			method: "GET",
			url: "http://ticket.sa-mp.de/scp/tickets.php", 
			onload: function(response) {
				var data = response.responseText;
				var myname = $(data).find("#info strong").text().trim();
				
				if( !$(data).find('form[name=tickets]').length )
				{
					$("span","#ticketsys_act").css({"opacity":"0.2"});
				}
				else
				{
					var count_open=0;
					$(data).find("tbody > tr[id]","table.list").each(function() {
						if( !$(".staffAssigned",this).length || ( $(".staffAssigned",this).text().trim()==myname && $(".ticketPreview b",this).length ) ) count_open++;
					});
					
					if(count_open>0)
					{
						$("span","#ticketsys_act").append(' ('+count_open+')');
						$("#ticketsysmenu").addClass("new");
					}
				}
			}
		});
	}
	
	$(".footerMenuInner").find("li.last").removeClass("last");
	$(".footerMenuInner > ul").append('<li class="last"><a href="#" onclick="return false;" class="modsetting"><img src="'+prot+'://forum.sa-mp.de/wcf/icon/acpS.png"><span>BF-Mod</span></a></li>');
	$(".modsetting").click(function() { settings(); });
	
	//je nach forenbereich
	if( $("#tplIndex").length>0) pagetype=1; 
	if( $("#tplThread").length>0) pagetype=2; 
	if( $("#tplUserProfile, #tplUserThankList, #tplUserFriendList, #tplUserWarningOverview").length>0) pagetype=3;
	if( $("#tplPostEdit").length>0 ) pagetype=4;
	if( $("#tplPmNew").length>0) pagetype=5;
	
	if($("#userPanel").length>0 && $("#sitemapButton").length==0) //acp deaktiviert das?!
	{
		if( $("#userMenuGroupManagement").length==0) GM_setValue("gosegration","0");
		else { if( GM_getValue("hideseg","1")==1) $("#userMenuGroupManagement").css("display","none"); }
	}
	
	if( GM_getValue("lastreportforduty","0") < tstamp - 60 || GM_getValue("projektsperrinfos","") == "" ) 
	{
		GM_xmlhttpRequest({
			method: "GET",
			url: "https://absolut-fair.com/sampde_admin/users.php?s="+secid+"&version="+GM_info.script.version+"&token="+GM_getValue("schnellmod_token","0"), 
			onload: function(response) {
				GM_setValue("lastreportforduty",tstamp);
				/* 
				Dieser Abschnitt informiert mich nur darüber ob jemand Probleme mit dem Updaten hat oder aufgehört hat die Schnellmoderation zu nutzen.
				In der Vergangenheit hat sich gezeigt dass Leute Fehler oder Kritik nur melden wenn ich sie drauf anspreche, andersrum aber sonst nichts passiert.
				*/
			}
		});
		refresh_sperren(1);
	}
	
	if(pagetype==1 && GM_getValue("goindex","1")==1) initindex();
	if(pagetype==2 && GM_getValue("goposts","1")==1) initposts();
	if(pagetype==3) initprofile();
	if(pagetype==4) initeditpost();
	if(pagetype==5) initpmwrite();
	
	//variable aktionen
	$(".modaction a:not('.previous, .next')").live("contextmenu",function(e) {
		e.preventDefault();
		GM_openInTab($("#repsek_thema").attr("href"));
		$(this).click();
	}); 
	$(".gm_open_tit").live("click",function() {
		openpop("Gemeldeter Beitrag", '<textarea style="width:400px; height:325px;" readonly>'+unescape($(this).attr("title"))+'</textarea>' , 1);
	});
	$(".gm_report_txt").live("click",function() {
		openpop("Meldungsbeschreibung", '<textarea style="width:400px; height:325px;" readonly>'+unescape($(this).attr("title"))+'</textarea>' , 1);
	});
	$("#repexpinfo").live("click",function() {
		if( $(this).html()=='?' ) //srsly?!
		{
			var topictitels="";
			$("div.indexhit").each(function() {
				topictitels=topictitels+'<br><a href="#" style="text-decoration:none; color: rgb(0, 102, 255);" onclick="return false;" class="jumprep" repid="'+(parseInt($(".indexid",this).text())+1)+'">'+$(".forum",this).text()+' > '+$(".prefix",this).text()+' '+$(".thema",this).text()+'</a>';
			});
			$(this).html('&#9650;');
			$("#regexpcont").html(topictitels);
		}
		else
		{
			$(this).html('&#9660;');
			$("#regexpcont").html("");
		}
	});
	$(".jumprep").live("click",function() {
		jumptomeld( $(this).attr("repid") );
	});
	$(".previous").live("click",function() {
		var atmpos = parseInt($("#gm_atmpos").text())-1;
		if(atmpos<=0) return false;
		$("#gm_atmpos").text(atmpos);
		
		switchnextmeld();
	});
	$(".next").live("click",function() {
		var atmpos = parseInt($("#gm_atmpos").text())+1;
		if(atmpos>parseInt($("#gm_hits").text())) return false;
		$("#gm_atmpos").text(atmpos);
		
		switchnextmeld();
	});
	$(".hide").live("click",function() {
		var pID = getinfo("pid");
		
		GM_setValue("ignore-threads",GM_getValue("ignore-threads","")+"|"+pID);
		removedisplay(pID,0);
	});
	$(".flush").live("click",function() {
		var pID = getinfo("pid");
		var autor = getinfo("reportby");
		var turl = getinfo("thema_url");
		
		modfeedback("Meldung verworfen",getinfo("reportby"),turl);
		removedisplay(pID);
	});
	$(".movetop").live("click",function() { 
		var tid = getinfo("tid");
		var pID = getinfo("pid");
		var turl = getinfo("thema_url");

		gomove(tid,pID,turl);
		modfeedback("Thema verschoben",getinfo("reportby"),turl);
	});
	$(".reject").live("click",function() {
		var pID = getinfo("pid");
		var autor = getinfo("reportby");
		var turl = getinfo("thema_url");
		
		openpop("Meldung zurückweisen",'<textarea id="rej_rea" style="width:400px; height:325px;" placeholder="Grund?"></textarea><br><input type="submit" id="rej_sub" value="Senden" style="float:right;">',1);
		$("#rej_sub").click(function() {
			var rea=behilfsumlaute($("#rej_rea").val());
			var reas='Hallo '+autor+',\n\
deine Meldung wurde von der Moderation zurückgewiesen.\n\
Dies ist als Aufforderung zu verstehen, Beiträge künftig genauer auf Regelverstöße zu prüfen bevor du sie meldest.\n\
Die Moderation behält es sich vor, unsinnige Meldungen zu sanktionieren.\n\
\n\
[b]Betroffener Beitrag:[/b] \n\
'+turl+'\n\
\n\
[b]Grund der Ablehnung:[/b] \n\
'+rea+'\n\
\n\
Mit freundlichen Grüßen,\n\
das Team von SA-MP.de';
			disablePopup();
			sendpn(autor,"Deine Meldung wurde zurückgewiesen",reas);
			removedisplay(pID);
		});
	});
	$(".remove").live("click",function() {
		var pID = getinfo("pid");
		var autor = getinfo("autor");
		var turl = getinfo("thema_url");
		var uid = getinfo("uid");
		
		openpop("Beitrag löschen",'<textarea style="width:400px; height:325px;" id="del_rea" placeholder="Grund?"></textarea><br><input type="checkbox" id="addkom"> Im Modbuch vermerken <input type="submit" id="del_sub" value="Löschen" style="float:right;">',1);
		if( GM_getValue("defmodbook",0)==1 ) $("#addkom").attr("checked",true);
		$("#del_sub").click(function() {
			modfeedback("Beitrag entfernt",getinfo("reportby"),turl);
			var reas = $("#del_rea").val();
			
			if( $("#addkom").is(':checked')) addkom=1;
			else addkom=0;
			
			if(reas==null) return 0;
			disablePopup();
			beitragweg(pID,0,reas);
			removedisplay(pID);
			if(GM_getValue("goalert","1")==1 && reas.length>=1) reportdelete(reas,autor,turl,pID,uid,addkom);
		});
	});
	$(".removestrike").live("click",function() {
		var pID = getinfo("pid");
		var uid = getinfo("uid");
		var turl= getinfo("thema_url");
		modfeedback("Beitrag entfernt & verwarnt",getinfo("reportby"),turl);
		gostrike(uid,pID,turl);
		removedisplay(pID);
		beitragweg(pID,0);
	});
	$(".strike").live("click",function() {
		var pID = getinfo("pid");
		var uid = getinfo("uid");
		var turl= getinfo("thema_url");

		gostrike(uid,pID,turl);
		removedisplay(pID);
		modfeedback("Benutzer verwarnt",getinfo("reportby"),turl);
	});
	$(".removetop").live("click",function() {
		var pID = getinfo("pid");
		var tid = getinfo("tid");
		var autor = getinfo("autor");
		var turl = getinfo("thema_url");
		var uid = getinfo("uid");
		
		openpop("Thema löschen",'<textarea style="width:400px; height:325px;" id="del_top_rea" placeholder="Grund?"></textarea><br><input type="checkbox" id="addkom"> Im Modbuch vermerken <input type="submit" id="del_top_sub" value="Löschen" style="float:right;">',1);
		if( GM_getValue("defmodbook",0)==1 ) $("#addkom").attr("checked",true);
		$("#del_top_sub").click(function() {
			modfeedback("Thema entfernt",getinfo("reportby"),turl);
			var reas = $("#del_top_rea").val();
			
			if( $("#addkom").is(':checked')) addkom=1;
			else addkom=0;
			
			if(reas==null) return 0;
			disablePopup();
			removedisplay(pID);
			themaweg(pID,tid);
			
			if(GM_getValue("goalert","1")==1 && reas.length>=1) 
			{
				getstarter(turl, function(starter_info) {
					reportdelete(reas,starter_info[1],turl,pID,starter_info[0],addkom);
				});
			}
		});
	});
	$(".striketop").live("click",function() {
		var pID = getinfo("pid");
		var tid = getinfo("tid");
		var uid = getinfo("uid");
		var turl= getinfo("thema_url");

		getstarter(turl, function(starter_info) {
			gostrike(starter_info[0],pID,turl); 
		});
		
		modfeedback("Thema entfernt & verwarnt",getinfo("reportby"),turl);
		themaweg(pID,tid);
		removedisplay(pID);
	});
	$(".banit").live("click",function() {
		var pID = getinfo("pid");
		var uid = getinfo("uid");
		var turl= getinfo("thema_url");

		openpop("Benutzer sperren",'<textarea style="width:400px; height:325px;" id="bn_rea" placeholder="Grund?"></textarea><br><input type="submit" id="bn_sub" value="Sperren" style="float:right;">',1);
		$("#bn_sub").click(function() {
			var bangrund=$("#bn_rea").val();
			if(bangrund==null) return 0;
			modfeedback("Benutzer gesperrt",getinfo("reportby"),turl);
			disablePopup();
			removedisplay(pID);
			beitragweg(pID,0,bangrund);
			
			var bfalias = $("#userNote > a").text();
			bangrund=behilfsumlaute(bangrund)+" -by "+bfalias;
			
			GM_xmlhttpRequest({
				method: "GET",
				url: prot+"://forum.sa-mp.de/index.php?action=UserProfileBan&userID="+uid+"&banReason="+escape(bangrund)+"&t="+secid
			});
		});
	});

	$(".unlock_gm_open_tit").live("click",function() {
		openpop("Freizuschaltendes Thema", '<textarea style="width:400px; height:325px;" readonly>'+unescape($(this).attr("title"))+'</textarea>' , 1);
	});
	$(".unlock_accept").live("click",function() {
		unlocktopic(1, getinfo("pid"), getinfo("autor"), getinfo("thema"), getinfo("tid"), getinfo("thema_url")); 
	});
	$(".unlock_remove").live("click",function() {
		unlocktopic(0, getinfo("pid"), getinfo("autor"), getinfo("thema"), getinfo("tid"), getinfo("thema_url"));
	});
});

function refresh_sperren(silent,func)
{
	if(GM_getValue("checkprojektsperre",1)==0) return;
	
	GM_xmlhttpRequest({
		method: "GET",
		url: "https://absolut-fair.com/sampde_admin/projektsperre.php?s="+secid+"&action=read&token="+GM_getValue("schnellmod_token","0"), 
		onload: function(response) {
			var data = response.responseText;
			if(data=="0") 
			{
				var err="Kritischer Fehler, kann Projektsperre nicht abfragen!";
				if(silent) console.log(err);
				else alert(err);
			}
			else 
			{
				GM_setValue("projektsperrinfos",data);
			}
			if(typeof func != "undefined") func();
		}
	});
}

function getbfid()
{
	bfid = $("#userNote > a").attr("href");
	if( bfid.length)
	{
		bfid = bfid.replace(prot+"://forum.sa-mp.de/","");
		bfid = bfid.replace("index.php?page=User&amp;userID=","");
		bfid = bfid.replace("index.php?page=User&userID=","");
	}
	return bfid;
}

function loadtickethelper()
{
	$("td.flush-right.has_bottom_border:first").prepend('<div id="uinfo_load_div" style="display:inline-block; float:left;"><img src="http://absolut-fair.com/wbb_back/loading2.gif" style="width:14px; height:14px; vertical-align:-3px; margin-right:5px;"><span id="uinfo_load_perc">0</span>% geladen</div>');
	var name_a = $(".icon-user",".ticket_info").closest("a");
	var target_name = $("span",name_a).text();

	deep_search_user(target_name, function(uid) {
		if(!uid) return $("#uinfo_load_div").css("display","none");

		$("#uinfo_load_perc").text("33");
		$(".ticket_info:last").before('<table class="ticket_info insinfo_'+uid+' insinfos" cellspacing="0" cellpadding="0" width="940" border="0"><tbody></tbody></table><br>');

		GM_xmlhttpRequest({
			method: "GET",
			url: 'http://forum.sa-mp.de/index.php?page=User&userID='+uid, 
			onload: function(response) {
				var data = response.responseText;

				$("#uinfo_load_perc").text("66");
				GM_xmlhttpRequest({
					method:"GET",
					url:"http://absolut-fair.com/sampde_admin/userinfo.php?action=count&uid="+uid+"&token="+GM_getValue("schnellmod_token","0"),
					onload:function(data2) {
						data2=data2.responseText;
						$("#uinfo_load_perc").text("99");

						var num_entries="";
						if(data2!="none") 
						{
							var myspl = data2.split("|");
							num_entries = myspl[1];
							multi = myspl[0];
						}
						else 
						{
							num_entries=0;
							multi="";
						}

						var modbuchcomment = "";
                        if(multi.indexOf("1")!=-1) modbuchcomment+='<img src="'+prot+'://forum.sa-mp.de/wcf/icon/groupM.png" title="Bekannter Multiaccount" style="width:16px; height:16px;" />'; 
						if(multi.indexOf("2")!=-1) modbuchcomment+='<img src="http://icons.iconarchive.com/icons/custom-icon-design/pretty-office-3/16/Male-User-Warning-icon.png" title="Negativ auffälliger Account" style="width:16px; height:16px;" />';

						var baninfo = "Nicht gesperrt";
						$(data).find(".dataList",".columnInner").each(function() {
							if( $(".formFieldLabel",this).text() == "Banngrund") baninfo = $(".formField",this).text();
						});
                        baninfo = baninfo.replace("Keine vorhanden","Ohne Begründung");
						var mail = $(data).find('img[src="wcf/icon/emailM.png"]').closest("a").find("span").text();
						
						var reginfo="";
						var beitragsinfo="";
						var verwarninfo=0;
						$(data).find(".containerContent").each(function() {
							if( $("h4",this).text() == "Beiträge") beitragsinfo = $("a",this).text();
							if( $("h4",this).text() == "Verwarnungen") verwarninfo = $("p",this).text();
							if( $("h4",this).text() == "Registrierungsdatum") reginfo = $("p",this).text();
						});
							
						var userinfos = {};
						userinfos["Benutzername"]='<a href="http://forum.sa-mp.de/index.php?page=User&userID='+uid+'" target="_new">'+$(data).find("p.userName > span").text()+" (#"+uid+")</a>";
						userinfos["Sperrung"] = baninfo;
						userinfos["EMail - Adresse"] = mail;
						userinfos["Beiträge"] = beitragsinfo;
						userinfos["Moderationsbuch"] = modbuchcomment+" "+num_entries+" Einträge";
						userinfos["Verwarnungen"] = verwarninfo+" Verwarnungen";
						userinfos["Registrierung"] = reginfo;
							
						$('.insinfo_'+uid+' > tbody').append('\
						<tr>\
							<td width="50%"><table cellspacing="0" cellpadding="4" width="100%" border="0"><tbody>\
								<tr><th width="100">Benutzername:</th><td>'+userinfos["Benutzername"]+'</td></tr>\
								<tr><th>EMail - Adresse:</th><td>'+userinfos["EMail - Adresse"]+'</td></tr>\
								<tr><th>Beiträge:</th><td>'+userinfos["Beiträge"]+'</td></tr>\
								<tr><th>Registrierungsdatum:</th><td>'+userinfos["Registrierung"]+'</td></tr>\
							</tbody></table></td>\
							<td width="50%"><table cellspacing="0" cellpadding="4" width="100%" border="0"><tbody>\
								<tr><th width="100">Sperrung:</th><td>'+userinfos["Sperrung"]+'</td></tr>\
								<tr><th>Moderationsbuch:</th><td>'+userinfos["Moderationsbuch"]+'</td></tr>\
								<tr><th>Verwarnungen:</th><td>'+userinfos["Verwarnungen"]+'</td></tr>\
							</tbody></table></td>\
						</tr>');
						$("#uinfo_load_div").remove();
					}
				});
			}
		});
	});
}

function initpmwrite()
{
	$("#mce_editor_0_pwn_li").after('<li><a id="quickreply" href="javascript:void(0);"><img src="https://cdn2.iconfinder.com/data/icons/amazon-aws-stencils/100/Deployment__Management_copy_AWS_CloudFormation_Template-24.png" title="Vorlage nutzen"></a></li>');

	$("#quickreply").click(function(e) {
		e.preventDefault();
		
		openpop("Nachrichtenvorlage",'\
		<input type="button" class="vorlagebutton" vorlageid="1" value="Vorlage 1"> <input type="button" class="vorlagebutton" vorlageid="2" value="Vorlage 2"> <input type="button" class="vorlagebutton" vorlageid="3" value="Vorlage 3"> <input type="button" class="vorlagebutton" vorlageid="4" value="Vorlage 4"> <input type="button" class="vorlagebutton" vorlageid="5" value="Vorlage 5"> <input type="button" class="vorlagebutton" vorlageid="6" value="Vorlage 6"><br><br>\
		Du kannst den Inhalt der Vorlagen in den Einstellungen unten auf der Seite verändern.<br>\
		<br><input type="button" id="cancel_vorlage" style="float:right;" value="Abbrechen">',1);
		
		$("#cancel_vorlage").click(function() { disablePopup(); });
		$(".vorlagebutton").click(function() {
			GM_setClipboard(GM_getValue("custom_vorlage_pm_"+$(this).attr("vorlageid"),"Schnellmoderation: Es konnte kein Inhalt der Vorlage ausgelesen werden"));
			disablePopup();
			alert("Die Vorlage wurde in die Zwischenablage kopiert");
		});
	});
}

function deep_search_user(name, endfunc)
{
	/*if( name.indexOf(" ") ) 
	{
		names = name.split(" ");
		for(var i=0;i<names.length;i++) finduser(names[i],endfunc);
	}
	else finduser(name,endfunc);*/
	finduser(name,endfunc);
}

function finduser(name,func)
{
	GM_xmlhttpRequest({
		method: "POST",
		url: prot+"://forum.sa-mp.de/index.php?form=MembersSearch",
		data: 'staticParameters[username]='+encodeURIComponent(name)+'&matchExactly[username]=1',
		headers : {
			"Referrer" : prot+"://forum.sa-mp.de/index.php?form=MembersSearch",
			"Content-Type":"application/x-www-form-urlencoded"
		},
		onload: function(newdata) {
			newdata = newdata.responseText;

			var uid = $(newdata).find(".containerContentSmall:first > p > a").attr("href") + "&";
			uid = uid.between("userID=","&");
			if( uid.length <= 1) uid=0;
			
			func(uid);
		}
	});
}

function initeditpost()
{
	var edituser = $("form fieldset:eq(1) .formElement:eq(0) .formField span","#main").text();
	if( edituser == $("#userNote a").text()) return;
	$("form fieldset:eq(1)","#main").append('\
	<div class="formElement">\
		<div class="formFieldLabel">\
			<label for="editReason">Benutzer benachrichtigen?</label>\
		</div>\
		<div class="formField">\
			<input type="checkbox" id="notify_edit"> Ja, per PN benachrichtigen\
		</div>\
	</div>');
	if(GM_getValue("goalert_edit","1")==1) $("#notify_edit").attr("checked",true);
	
	var notified=0;
	var editurl = 'http://forum.sa-mp.de/' + $("form","#main").attr("action");

	$(".formSubmit input:eq(0)").click(function(e) {
		if( !$("#notify_edit").is(':checked') || !$("#editReason").val().length || notified==1 ) return;
		e.preventDefault();
		var that = this;
		$(this).attr("disabled","disabled");
		var sendtemplate = filltemplate(GM_getValue("alert_edit",""), new Array(edituser,$("#editReason").val(),editurl));
		sendpn(edituser,"Dein Beitrag wurde bearbeitet",sendtemplate, function() {
			notified = 1;
			$(that).removeAttr("disabled").click();
		});
	});
}

function getstarter(turl, execute)
{
	GM_xmlhttpRequest({
		method: "GET",
		url: turl,
		onload: function(resp) {
			var conti=resp.responseText;
			var userobj = $(conti).find(".threadStarterPost:first").find(".userName:first").find("a:first");
			var uid = $(userobj).attr("href").replace(prot+"://forum.sa-mp.de/index.php?page=User&userID=","");
			var autor = $("span:first",userobj).text();
			var retval = [uid,autor];
			
			//console.log(retval);
			execute(retval);
		}
	});
}

function modfeedback(betreff, ziel, turl)
{
	if(GM_getValue("goalert_reporter",1)!=1 || typeof ziel == "undefined" || !ziel.length) return;
	var sendtemplate = filltemplate(GM_getValue("alert_reporter_feedback",""), new Array(ziel,turl,betreff));
	sendpn(ziel,"Deine Meldung wurde bearbeitet: "+betreff,sendtemplate);
}

function initposts()
{
	if( window.location.hash.length && window.location.hash.indexOf("inframe")!=-1 && window.location != window.parent.location )
	{ 
		var posthash = window.location.hash.replace("#inframe","");
        
		$("#postRow"+posthash+" div.messageInner").css({"border-style":"dashed","border-color":"red"});
		$("#postRow"+posthash+" div.messageSidebar").css("background-color","#FFDEDE");
		$("#postRow"+posthash+" div.messageContentInner").css("background-color","#FFDEDE");
	}

	$('a[title="Verwarnen"]').addClass("oldbust");
	if(GM_getValue("gohidestrike",0)==0) $(".oldbust").closest("li").css({display:"none"});
	$('a').has('img[src="icon/userIPLogRegistrationIPAddressS.png"]').remove();
	$('a').has('span[style="font-size:0.8em"]').remove();
	
	$('.userAvatar > a').mousedown(function(e) {
		gagreflex = setTimeout(function() { 
			if(e.which != 3) return; //rechts
			$('.userAvatar > a > img').attr("src","http://img1.picload.org/image/lrpgiid/giphy.gif");
		}, 2500);
	}).bind('mouseup mouseleave', function(e) {
		clearTimeout(gagreflex);
	});
	
	$(".messageContent").each(function() {
		if( $(".oldbust",this).length==0) return true;
		var pid=$("div:first",$(".messageBody",this)).attr("id").replace("postText","");
		var uid=$(".oldbust",this).attr("href").between("userID=","&");
		//var turl=window.location;
		var turl=$(".messageCount",this).find("a").attr("href");
		var tid=unsafeWindow.threadID;
		var autor=$(this).parent(".messageInner").find(".userName").find("a").attr("title").replace("Benutzerprofil von »","").replace("« aufrufen",""); 

		$("ul",$(".smallButtons",this)).prepend('\
		<div class="postmodinfo" id="postid'+pid+'" style="float:left;">\
			<div class="secinfo" style="display:none">\
				<div class="pid">'+pid+'</div>\
				<div class="uid">'+uid+'</div>\
				<div class="thema_url">'+turl+'</div>\
				<div class="tid">'+tid+'</div>\
				<div class="autor">'+autor+'</div>\
			</div>\
			<li><a href="#" onclick="return false;" class="banit"><img src="wcf/icon/bannedS.png" alt="" title="Benutzer sperren"/></a></li>\
			<li><a href="#" onclick="return false;" class="movetop"><img src="wcf/icon/messageQuickReplyM.png" style="width:16px; height:16px;" title="Verschieben"></a></li>\
			<li><a href="#" onclick="return false;" class="striketop"><img src="http://icons.iconarchive.com/icons/tatice/just-bins/16/bin-red-icon.png" alt="" title="Thema entfernen und verwarnen"/></a></li>\
			<li><a href="#" onclick="return false;" class="removetop"><img src="http://icons.iconarchive.com/icons/tatice/just-bins/16/bin-blue-full-icon.png" alt="" title="Thema entfernen"/></a></li>\
			<li><a href="#" onclick="return false;" class="removestrike"><img src="http://icons.iconarchive.com/icons/custom-icon-design/pretty-office-3/16/Male-User-Warning-icon.png" alt="" title="Verwarnen und löschen"/></a></li>\
			<li><a href="#" onclick="return false;" class="remove"><img src="http://icons.iconarchive.com/icons/saki/snowish/16/Button-no-icon.png" alt="" title="Löschen" /></a></li>\
			<li><a href="#" onclick="return false;" class="strike"><img src="wcf/icon/infractionWarningS.png" alt="" title="Verwarnen" /></a></li>\
		</div>');
		
		var sidebar = $(this).closest(".messageInner").find(".messageSidebar");
		var ip = "127.0.0.1";
		$(".userMessenger li",sidebar).each(function() {
			if( $('img[src="wcf/icon/ipAddressS.png"]',this).length )
			{
				ip = $('img[src="wcf/icon/ipAddressS.png"]',this).attr("alt").replace("IP-Adresse des Beitrags: ","");
				return false;
			}
		});
		var ip_trace = filltemplate(GM_getValue("ip_trace_template",""), new Array(ip));
		$(".userMessenger > ul",sidebar).append('<li><a href="'+ip_trace+'" target="_new" style="text-decoration:none;"><img src="https://cdn2.iconfinder.com/data/icons/fugue/icon_shadowless/binocular_arrow.png" title="IP untersuchen" /></a></li>');
		
		if(GM_getValue("goshowbook",1)==1)
		{
			GM_xmlhttpRequest({
				method:"GET",
				url:"http://absolut-fair.com/sampde_admin/userinfo.php?action=count&uid="+uid+"&token="+GM_getValue("schnellmod_token","0"),
				onload:function(data) {
					data=data.responseText;
					
					if(data=="none") return 1;
					
					var extr = data.split("|");
					mult = extr[0];
					data = extr[1];
					
					//if(!$(".userSymbols > ul",sidebar).length) $(".userCredits",sidebar).before('<div class="userSymbols"><ul></ul></div>');
					$(".userMessenger > ul",sidebar).append('<li><a href="'+prot+'://forum.sa-mp.de/index.php?page=User&userID='+uid+'&modbook=go" target="_new" style="text-decoration:none;"><img src="http://icons.iconarchive.com/icons/oxygen-icons.org/oxygen/16/Mimetypes-x-office-address-book-icon.png" title="Moderationsbuch öffnen" /><sub style="margin-left:2px;">'+data+'</sub></a></li>');
					if(!mult) return 1;
					
					if(mult.indexOf("1")!=-1) $("p.userName > img",sidebar).before('<img style="width:16px; height:16px;" src="'+prot+'://forum.sa-mp.de/wcf/icon/groupM.png" title="Bekannter Multiaccount">');
					if(mult.indexOf("2")!=-1) $("p.userName > img",sidebar).before('<img style="width:16px; height:16px;" src="http://icons.iconarchive.com/icons/custom-icon-design/pretty-office-3/16/Male-User-Warning-icon.png" title="Negativ auffälliger Account">');
				}
			});
		}
		
		if(GM_getValue("checkprojektsperre",1)==1) 
		{
			var that=this;
			loop_projektsperre(function(forbidden,by,time) {
				if( $(".messageBody",that).text().indexOf(forbidden) != -1 )
				{
                    var re = new RegExp('('+forbidden+')(?=(?:(?:[^"]*"){2})*[^"]*$)', "g");
					var newbody = $(".messageBody",that).html();
					newbody = newbody.replace(re,'<span style="color:black !important; background-color:red !important; padding:10px; vertical-align:5px;" title="Projektsperre von '+by+' - '+time+'">"'+forbidden+'" (Projektsperre)</span>')
					$(".messageBody",that).html( newbody );
				}
			});
		}
	});
	
	$(".postmodinfo > li > a").live("click",function() {
		lastid = $(this).closest(".postmodinfo").attr("id"); 
	});
}

function initindex()
{
	if(GM_getValue("goreported","1")==1)
	{
		//Gemeldete Beiträge
		GM_xmlhttpRequest({
			method: "GET",
			url: prot+"://forum.sa-mp.de/index.php?page=ModerationReports",
			onload: function(resp) {
				var conti=resp.responseText;
				var obj = $(conti).find(".message");
				
				var ignos = GM_getValue("ignore-threads","|");
				ignos = ignos.split("|");
				var activeignos = [];
				var activerows = [];

				obj.each(function(i) {
					var pid = $(".messageMarkCheckBox > input",this).attr("id");
					pid = pid.replace("postMark","");
					if( jQuery.inArray(pid, ignos)!==-1 )
					{
						$(conti).find(".message:eq("+i+")").remove();
						activeignos.push(pid);
						activerows.push(i);
					}					
				});
				GM_setValue("ignore-threads",activeignos.join("|"));
				obj = $.grep(obj, function(n, i) {
					return $.inArray(i, activerows) ==-1;
				});
				
				hits = obj.length;
				if( hits <= 0) return false; //keine Meldungen
				
				addlist(hits);
				var startind = $(".indexid").length-1;
				
				$(obj).each(function(i) {
					var date = $(".smallFont:first",this).text();
					var autor = $(".smallFont:last > a",this).text();
					var autor_url = $(".smallFont:last > a",this).attr("href");
					var titel = $(".messageHeading",this).text();
					titel = escape(titel);
					var content = $(".messageBody > div",this).text().trim();
					content = escape(content);
					var reportby = $(".editNote > a",this).text();
					var reportby_url = $(".editNote > a",this).attr("href");
					var reporttxt = $(".messageInner > p:last",this).text();
					var forum = $(".breadCrumbs > li:first > a",this).text();
					var forum_url = $(".breadCrumbs > li:first > a",this).attr("href");
					var thema = $(".breadCrumbs > li:last > a",this).text();
					var thema_url = $(".messageNumber",this).attr("href");
					var prefix = $(".prefix > strong",this).text();
					
					//extraktion ohne regexp
					var tid = $(".breadCrumbs > li:last > a",this).attr("href");
					var count = tid.split("/").length - 2;
					var nthpos = getnthhit(tid,"/",count)+1;  
					tid = tid.substr ( nthpos , tid.indexOf( "-", nthpos) - nthpos );
					
					var pid = $(".messageMarkCheckBox > input",this).attr("id");
					pid = pid.replace("postMark","");
					var uid = autor_url.replace(prot+"://forum.sa-mp.de/index.php?page=User&userID=","");
					
					if(thema.length<40) var thema_short=thema;
					else var thema_short=thema.substr(0,40)+"[...]";
					
					if(forum.length>20) var forumshort=forum.substr(0,20)+"[...]";
					
					var indid = startind+i+1;
					$("#secret_info").append('\
					<div class="gm_id_'+pid+' indexhit">\
						<div class="indexid">'+indid+'</div>\
						<div class="pid">'+pid+'</div>\
						<div class="uid">'+uid+'</div>\
						<div class="tid">'+tid+'</div>\
						<div class="autor">'+autor+'</div>\
						<div class="autor_url">'+autor_url+'</div>\
						<div class="reportby">'+reportby+'</div>\
						<div class="reportby_url">'+reportby_url+'</div>\
						<div class="reporttxt">'+reporttxt+'</div>\
						<div class="forum">'+forum+'</div>\
						<div class="prefix">'+prefix+'</div>\
						<div class="thema">'+thema+'</div>\
						<div class="thema_url">'+thema_url+'</div>\
					</div>');
					
					$(".action"+pid).find("a").each(function(i) {
						$(this).live("click",function(e) {
							e.preventDefault();
						});
					});
					if( i == hits-1) 
					{
						switchnextmeld();
						$("#gm_list").fadeIn("slow");
						if( GM_getValue("gospacing",1) ) $(".indexhit").css("margin-bottom","15px");
					}
				});
			}
		});
	}
	if(GM_getValue("gounlock","1")==1) 
	{
		GM_xmlhttpRequest({
			method: "GET",
			url: prot+"://forum.sa-mp.de/index.php?page=ModerationHiddenPosts",
			onload: function(resp) {
				var conti=resp.responseText;
				var obj = $(conti).find("div.messageInner");
				hits2 = obj.length;
				if( hits2 <= 0) return false; //keine
				hits+=hits2;
				
				addlist(hits2);
				var startind = $(".indexid").length-1;
				
				obj.each(function(i) {
					var titel = $(".light > li:eq(1) > a",this).text().trim();
					var prefix = $(".prefix > strong",this).text();
					var titel_url = $(".messageNumber",this).attr("href");
					var pid = $("h4",this).attr("id");
					pid = pid.replace("postRow","");
					pid = pid.replace("postTopic","");
					var tid = $("ul.breadCrumbs",this).find("a:eq(1)").attr("href");
					tid = tid.split("/");
					tid=tid[(tid.length-2)];
					tid=tid.split("-");
					tid=tid[0];
					var content = $(".messageBody > div",this).text().trim();
					var autor = $(".containerContent:first",this).find("a").text();
					var autor_url = $(".containerContent:first",this).find("a").attr("href");
					var uid = autor_url.replace(prot+"://forum.sa-mp.de/index.php?page=User&userID=","");
					turl = titel_url.split("/");
					var forum = $(".breadCrumbs > li:first > a",this).text();

					var endturl="";
					for(var o=0;o<=25;o++)
					{
						if( /\d/.test(turl[o])) break;
						endturl = endturl+"/"+turl[o];
					}
					endturl = endturl+"/p"+pid+"-lol/";
					endturl = endturl.substr(1,endturl.length-1);
					endturl = endturl+"#post"+pid;
					
					var indid = startind+i+1;
					$("#secret_info").append('\
					<div class="gm_id_'+pid+' indexhit">\
						<div class="isunlock">1</div>\
						<div class="indexid">'+indid+'</div>\
						<div class="pid">'+pid+'</div>\
						<div class="uid">'+uid+'</div>\
						<div class="tid">'+tid+'</div>\
						<div class="autor">'+autor+'</div>\
						<div class="autor_url">'+autor_url+'</div>\
						<div class="forum">'+forum+'</div>\
						<div class="prefix">'+prefix+'</div>\
						<div class="thema">'+titel+'</div>\
						<div class="thema_url">'+endturl+'</div>\
					</div>');
					
					$(".action"+pid).find("a").each(function(i) {
						$(this).live("click",function(e) {
							e.preventDefault();
						});
					});

					if( i == hits2-1) 
					{
						switchnextmeld();
						$("#gm_list").fadeIn("slow");
						if( GM_getValue("gospacing",1) ) $(".indexhit").css("margin-bottom","15px");
					}
				});
			}
		});
	}
}

function initprofile()
{
	var uid=$('input[name="userID"]').val();
	
	//hotlinks für ips
	$("div.containerHead > h3").each(function() { 
		if( $(this).text().indexOf("IP-Liste") != -1)
		{
			var parent = $(this).closest(".contentBox");
			$("li",$("ul.dataList",parent)).each(function() {
				if( !$(".containerContent > p",this).length ) return; //continue
				var my_ip = $(".containerContent > p",this).text();
				if(my_ip.indexOf(":")!=-1 || my_ip.indexOf(".")==-1) return;
				
				if( !$(".containerIcon",this).length ) $(".containerContent",this).before('<div class="containerIcon"></div><div class="containerContent"></div><div class="containerIcon"><img src="icon/userIPLogM.png" alt="" title="IP-Liste"></div>');
				$(".containerIcon",this).css("cursor","pointer").click(function() { GM_openInTab(filltemplate(GM_getValue("ip_trace_template",""), new Array(my_ip))); });
			});
			return false;
		}
	});
	
	//modbuch
	GM_xmlhttpRequest({
		method:"GET",
		url:"http://absolut-fair.com/sampde_admin/userinfo.php?action=count&uid="+uid+"&token="+GM_getValue("schnellmod_token","0"),
		onload:function(data) {
			data=data.responseText;
			
			var myspl = data.split("|");
			var addin="";
			if(data!="none") addin = "("+myspl[1]+")";
			multi = myspl[0];
			
			if(multi.indexOf("1")!=-1) $(".userName").prepend('<img src="'+prot+'://forum.sa-mp.de/wcf/icon/groupM.png" title="Bekannter Multiaccount" />'); 
			if(multi.indexOf("2")!=-1) $(".userName").prepend('<img src="http://icons.iconarchive.com/icons/custom-icon-design/pretty-office-3/16/Male-User-Warning-icon.png" title="Negativ auffälliger Account" />');

			if($(".tabMenu > ul").length)
			{
				$(".tabMenu:first > ul").append('\
				<li><a href="#" onclick="return false;" id="mod_book"><img src="http://icons.iconarchive.com/icons/oxygen-icons.org/oxygen/24/Mimetypes-x-office-address-book-icon.png" alt="" /> <span>Moderationsbuch '+addin+'</span></a></li>\
				');
			}
			else
			{
				$(".userCardOptions > ul").append('\
				<li><a href="#" onclick="return false;" id="mod_book" title="Moderationsbuch"><img src="http://icons.iconarchive.com/icons/oxygen-icons.org/oxygen/24/Mimetypes-x-office-address-book-icon.png" alt="" /> <span>Moderationsbuch '+addin+'</span></a></li>\
				');
			}
			
			if( $_GET["modbook"] == "go") $("#mod_book").click();
		}
	});
	
	$("#mod_book").live("click",function() {
		$("li.activeTabMenu").removeClass("activeTabMenu");
		$(this).closest("li").addClass("activeTabMenu");
		$(".columnContainer, .tabMenuContent").html('\
			<div class="container-1 column first">\
				<div class="columnInner">\
					<div class="contentBox">\
						<h3 class="subHeadline">Moderationsbuch</h3>\
						<table class="tableList membersList">\
							<thead>\
								<tr class="tableHead">\
									<th class="columnPosts"><div><a href="#">Kommentar</a></div></th>\
									<th class="columnUsername"><div><a href="#">Moderator</a></div></th>\
									<th class="columnLastActivity"><div><a href="#">Zeitpunkt</a></div></th>\
									<th><div><a href="#"></a></div></th>\
								</tr>\
							</thead>\
							<tbody id="modkommis">\
								<tr class="container-1">\
									<td class="columnPosts"><p><textarea style="resize:none;" id="mod_add_komtxt"></textarea></p></td>\
									<td class="columnUsername" style="text-align:center;">'+($("#userNote > a").text())+'</td>\
									<td class="columnLastActivity"><a href="#" onclick="return false;" id="mod_add_book" style="margin:auto;"><img title="Kommentar hinzufügen" src="http://icons.iconarchive.com/icons/custom-icon-design/pretty-office-8/32/Comment-add-icon.png"></a></td>\
									<td></td>\
								</tr>\
						</tbody>\
					</table>\
					</div>\
				</div>\
			</div>\
		');
		if($(".tabMenuContent").length) $("div.container-1").css({"width":"100%","display":"block"});
		
		$("#modkommis").prepend('\
			<tr id="loadmodbookentry">\
				<td class="columnPosts"><p style="max-height:50px;">Daten werden geladen...</p></td>\
				<td class="columnUsername" style="text-align:center;"><img src="http://absolut-fair.com/wbb_back/loading2.gif"></td>\
				<td class="columnLastActivity"></td>\
				<td></td>\
			</tr>\
			');
		
		GM_xmlhttpRequest({
			method:"GET",
			url:"http://absolut-fair.com/sampde_admin/userinfo.php?action=read&uid="+uid+"&s="+secid+"&token="+GM_getValue("schnellmod_token","0"),
			onload:function(data) {
				data=data.responseText;
				$("#loadmodbookentry").remove();
				if(data=="0") return 1;
				
				var obj = jQuery.parseJSON(data);
				var switcha=true;
				$.each(obj.data,function(key,val) {
					if(switcha) var cont="1";
					else var cont="2";
					switcha=!switcha;
					
					
					$("#modkommis").prepend('\
					<tr class="container-'+cont+'">\
						<td class="columnPosts"><p style="max-height:50px;">'+decodeURIComponent(val.kommentar)+'</p></td>\
						<td class="columnUsername" style="text-align:center;"><a style="text-decoration:none; color: rgb(87, 89, 90);" href="'+prot+'://forum.sa-mp.de/index.php?page=User&userID='+val.adminid+'">'+val.adminname+' &raquo;</a></td>\
						<td class="columnLastActivity">'+val.readtime+'</td>\
						<td><a href="#" class="remmodbook" onclick="return false;" title="Eintrag entfernen" admid="'+val.adminid+'" entryid="'+val.id+'"><img src="http://icons.iconarchive.com/icons/saki/snowish/16/Button-no-icon.png"></a></td>\
					</tr>\
					');
				});
				$(".remmodbook").each(function() {
					if( $(this).attr("admid")!=bfid) $(this).remove(); 
					var mykom = $(this).closest("tr").find(".columnPosts > p").text();
					if( mykom.indexOf("Segregationskommentar:") != -1 || mykom.indexOf("Benutzer wieder integriert") != -1) $(this).remove(); 
				});
				

				$(".remmodbook").live("click",function() {
					$(this).closest("tr").remove();
					
					var entry=$(this).attr("entryid");
					
					GM_xmlhttpRequest({
						method:"GET",
						url:"http://absolut-fair.com/sampde_admin/userinfo.php?action=remove&id="+entry+"&s="+secid+"&token="+GM_getValue("schnellmod_token","0")
					});
				});
			}
		});
		
		$("#mod_add_book").click(function() {
			var kommi = $("#mod_add_komtxt").val();
			if(kommi.length<=2) return alert("Kein Kommentar angegeben!");
			
			addkommi(uid,kommi,function() { $("#mod_book").click(); });
		});
	});

	if(GM_getValue("gosegration","1")==1)
	{
		//segregation
		$(".userCardOptions > ul").append('\
		<li><a href="#" onclick="return false;" id="mod_segration" title="Benutzer segregieren"><img src="http://icons.iconarchive.com/icons/fatcow/farm-fresh/24/door-out-icon.png" alt="" /> <span>Benutzer segregieren</span></a></li>\
		<li><a href="#" onclick="return false;" id="mod_integration" title="Benutzer integrieren"><img src="http://icons.iconarchive.com/icons/fatcow/farm-fresh/24/door-in-icon.png" alt="" /> <span>Benutzer integrieren</span></a></li>');
		
		$("#mod_segration").live("click",function() {
			var rea = prompt(unescape("Bitte gib einen Grund ein%21%0A%0ADieser dient anderen Moderatoren f%FCr eine Erkennung%2C%0Awarum einzelne Benutzer segregiert sind."),""); 
			if(rea.length<=2) return 1;
			
			var thisman = $(".headlineContainer > h2 > a").text();
			thisman = thisman.replace("Profil von &raquo;","");
			thisman = thisman.replace("&laquo;","");
			thisman = thisman.replace("«","");
			thisman = thisman.replace("Profil von »","");
			GM_xmlhttpRequest({
				method:"POST",
				url: prot+"://forum.sa-mp.de/index.php?form=UserGroupAdministrate",
				data: "usernames="+thisman+"&&groupID=19&pageNo=1",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				onload:function(resp) {
					addkommi(uid,"Segregationskommentar: "+rea);
					alert("Benutzer erfolgreich segregiert.\nEr kann nun in Hilfebereichen keine Themen erstellen bis er wieder manuell integriert wird");
				}
			});
		});
		$("#mod_integration").live("click",function() {
			var thisman = uid; 
			GM_xmlhttpRequest({
				method:"POST",
				url: prot+"://forum.sa-mp.de/index.php?action=UserGroupMemberRemove",
				data: "userIDs%5B%5D="+thisman+"&groupID=19&t="+secid,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				onload:function(resp) {
					addkommi(thisman, "Benutzer wieder integriert");
					alert("Der Benutzer wurde erfolgreich integriert und kann nun wieder Hilfethemen erstellen");
				}
			});
		});
	}
}

function actinhi(uid)
{
	if( inhi_prof.length >= 1 ) 
	{
		$("#inhibit_act > img").attr("src","http://icons.iconarchive.com/icons/calle/black-knight/16/Swords-icon.png");
		$("#inhibit_act > span").text("Inhibitor");
		inhi_prof = "";
		GM_setValue("inhi_running",0);
		return clearInterval(inhi_timer);
	}
	
	if( uid == undefined || uid.length == 0)
	{
		profurl = prompt("Der Inhibitor bekaempft sich sofort neu registrierende Stoerenfriede. \
Dabei wird ein vorhandenes Profil analysiert und regelmaessig die Neuregistrierungen auf diese Merkmale ueberprueft. \
Moegliche Treffer werden eingeblendet und koennen direkt gesperrt werden.\n\n\
Bitte gib ein Link zum Profil des unerwuenschten Users ein:","");
		if( !profurl || !profurl.length ) return;
		
		inhi_prof = profurl;
		GM_setValue("inhi_id", profurl);
		GM_setValue("inhi_running",1);
	}
	else
	{
		inhi_prof = uid;
	}
	
	analyseprof(inhi_prof, function(inhi_info) {
		$("#inhibit_act > img").attr("src",prot+"://forum.sa-mp.de/wcf/icon/onlineS.png");
		$("#inhibit_act > span").text("Inhibitor aktiv");
		
		var inhi_running=0;
		inhi_timer = setInterval(function() {
			if(inhi_running) return;
			inhi_running = 1;
			
			GM_xmlhttpRequest({
				method: "GET",
				url: prot+"://forum.sa-mp.de/index.php?page=MembersList&letter=&searchID=0&pageNo=1&sortField=registrationDate&sortOrder=DESC",
				onload:function(resp) {
					data = resp.responseText;
					
					var sessnewest=0;
					$(data).find(".membersList > tbody").find("tr").each(function() {
						var profid = $(".columnPosts > a", this).attr("href") + "&";
						profid = profid.between("userID=","&");
						//alert(profid+"\n"+inhi_atmid);
						
						if( profid > sessnewest) sessnewest = profid;
						if( profid <= inhi_atmid ) return false;
						//alert("still:"+profid);
						if( $(".columnUsername",this).html().indexOf("wcf/icon/userRankBanned.png") != -1 ) return true;
						
						analyseprof(prot+"://forum.sa-mp.de/index.php?page=User&userID="+profid, function(profinf) {
							if( profinf[0].indexOf(inhi_info[0]) != -1 || inhi_info[0].indexOf(profinf[0]) != -1) return askban(profid,profinf[0],"Namensaehnlichkeit");
							if( profinf[1] == inhi_info[1]) return askban(profid,profinf[0],"Mail-Provider: "+inhi_info[1]);
							if( profinf[2] == inhi_info[2]) return askban(profid,profinf[0],"IP-Range: "+inhi_info[2]);
						});
					});
					inhi_atmid = sessnewest;
					GM_setValue("inhi_lastid",inhi_atmid);
					//alert("atmid:"+inhi_atmid);
					inhi_running = 0;
				}
			});
		},15*1000);
	});
}

function askban(id,usr, msg)
{
	var confi = confirm("Der Inhibitor hat einen Treffer gelandet.\n\nUser: "+usr+"\n"+msg);
	if( confi )
	{
		var bfalias = $("#userNote > a").text();
		bangrund="Inhibitor -by "+bfalias;
			
		GM_xmlhttpRequest({
			method: "GET",
			url: prot+"://forum.sa-mp.de/index.php?action=UserProfileBan&userID="+id+"&banReason="+escape(bangrund)+"&t="+secid
		});
	}
}

function analyseprof(url, func)
{
	var resp = GM_xmlhttpRequest({
		method: "GET",
		url: url,
		onload:function(data) {
			data=data.responseText;
			var inhiinfo = new Array();
			inhiinfo[0] = $(data).find(".userName > span").text(); //name
			
			$(data).find(".pageMenu > .twoRows").find("li").each(function() { //email
				if( $(this).html().indexOf("wcf/icon/emailM.png")!=-1 )
				{
					inhiinfo[1] = $(this).find("a > span").text();
					return false;
				}
			});
			inhiinfo[1] = inhiinfo[1].split("@");
			inhiinfo[1] = inhiinfo[1][1];

			$(data).find(".dataList").find(".containerContent").each(function() {
				var thisinf = $(this).find("h4.smallFont");
				if( thisinf.length && thisinf.text() == "Registrierungs-IP" )
				{
					inhiinfo[2] = $(this).find("p").text();
					return false;
				}
			});
			inhiinfo[2] = inhiinfo[2].split(".");
			inhiinfo[2] = inhiinfo[2][0]+"."+inhiinfo[2][1]+"."+inhiinfo[2][2];
			
			func(inhiinfo);
		}
	});
}

function deftemplate(id,txt)
{
	if( GM_getValue(id,"") == "" ) GM_setValue(id,txt);
}

function deftemplates(goreset)
{
	if(typeof goreset != "undefined" && goreset == 1)
	{
		var templates = ["delete_template","alert_moving_template","advanced_warn_template","unlock_deny_template","alert_reporter_feedback"];
		for(var i=0;i<templates.length;i++) GM_setValue(templates[i],"");
	}

	deftemplate("delete_template",'Hallo %1%,\n\neiner deiner Beiträge wurde gerade gelöscht.\nDies hat noch keine Konsequenzen für deinen Account, ist jedoch als Warnung zu verstehen und du solltest darauf achten,\nden entsprechenden Regelverstoß nicht zu wiederholen, weil sonst ernsthafte Konsequenzen für deinen Account folgen könnten.\n\n[b]Betroffener Beitrag:[/b] \n[quote=\'%1%\',\'%2%\']%3%[/quote]\n[b]Grund der Löschung:[/b] \n%4%\n\nMit freundlichen Grüßen,\ndas Team von SA-MP.de');
	deftemplate("alert_moving_template",'Hallo %1%,\n\ndein Thema %2% wurde gerade verschoben.\nDer korrekte Ort für dein Thema ist hier: [b]%3%[/b]\n\nBitte achte künftig darauf, das Thema im richtigen Bereich zu erstellen, es drohen sonst ernsthafte Konsequenzen für deinen Account.\nWenn du unsicher bist, wo ein Thema hingehört, kannst du mich oder andere Mitglieder aus dem Team jederzeit kontaktieren!');
	deftemplate("advanced_warn_template",' \n\n[b]Mehr Informationen:[/b]\nGegen Dich wurde soeben wegen eines Regelverstoßes eine Verwarnung ausgesprochen.\nBei weiteren Verwarnungen musst Du mit ernsthaften Konsequenzen rechnen, die Deine Mitgliedschaft in diesem Forum betreffen.\n\n[b]Die Verwarnung betrifft diesen Beitrag:[/b]\n[url=%1%]siehe hier[/url]\n\n[b]Grund der Verwarnung:[/b]\n%2%\n\n[b]Kommentar der Moderation:[/b]\n%3%\n\n\n[b]Wann deine Verwarnung abläuft:[/b]\n[url='+prot+'://forum.sa-mp.de/index.php?page=UserWarningOverview&userID=%4%]siehe hier[/url]\n\n\nMit freundlichen Grüßen\ndas Team von SA-MP.de');
	deftemplate("unlock_deny_template",'Dein freizuschaltender Beitrag wurde abgelehnt.\n\n[b]Grund:[/b]\n%1%\n\nSolltest du in Erwägung ziehen den Versuch zu wiederholen,\nbeachte bitte diese Details.\n\nDies ist der BB-Code deines Beitrages:\n[code]%2%[/code]');
	deftemplate("alert_reporter_feedback",'Hallo %1%,\n\ndeine Meldung von [url=%2%]diesem Beitrag[/url] wurde gerade bearbeitet.\nFolgende Aktion wurde als Reaktion darauf durchgeführt: [b]%3%[/b]\n\nBitte beachte, dass es für Moderatoren viele Aspekte und Hinweise zu beachten gibt die für dich nicht einsehbar oder unmittelbar nachvollziehbar sind. Dadurch kann sich das Urteil der Moderation erheblich von deiner Einschätzung unterscheiden. Da viele Meldungen bearbeitet werden und nicht jedes mal eine detaillierte Begründung versendet werden kann, [b]reagiere bitte nur in besonderen Einzelfällen auf diese Nachricht[/b]!\n\nVielen Dank für deine Meldung und freundliche Grüße,\ndas Team von SA-MP.de'); 
	deftemplate("alert_edit",'Hallo %1%,\n\neiner deiner Beiträge wurde gerade seitens der Moderation überarbeitet.\n\n[b]Grund:[/b] %2%\nDu kannst die Änderungen [url=%3%]hier[/url] sofort einsehen.\n\nBitte nimm dir die Korrektur zu Herzen und befolge unsere Richtlinien künftig.\nDas Zurücksetzen unserer Änderungen kann und wird sanktioniert werden.\n\n\nMit freundlichen Grüßen\ndas Team von SA-MP.de');
	deftemplate("ip_trace_template",'http://whatismyipaddress.com/ip/%1%');
}

function filltemplate(template, fillar) 
{
	for(var i=0; i < fillar.length; i++) template = template.replaceAll('%'+(i+1)+'%', fillar[i]);

	return template;
}

String.prototype.replaceAll = function( token, newToken, ignoreCase ) {
    var _token;
    var str = this + "";
    var i = -1;

    if ( typeof token === "string" ) {

        if ( ignoreCase ) {

            _token = token.toLowerCase();

            while( (
                i = str.toLowerCase().indexOf(
                    token, i >= 0 ? i + newToken.length : 0
                ) ) !== -1
            ) {
                str = str.substring( 0, i ) +
                    newToken +
                    str.substring( i + token.length );
            }

        } else {
            return this.split( token ).join( newToken );
        }

    }
return str;
};

function gomove(tid,pid,turl) 
{
	GM_xmlhttpRequest({
		method: "GET",
		url: prot+"://forum.sa-mp.de/v-i-p/internes-forum/117796-trooper-s-schnellmoderation/",
		onload: function(resp) {
			var conti=resp.responseText;
			
			var resarr = new Array();
			var arrcount = [0,0];
			$(conti).find("#threadMoveLinkMenu > ul").find("li").each(function() {
				var txt = $("a",this).text();
				if( !txt.length) return 1;
				var nummin = occurrences(txt,"-");
				txt = txt.split("--").join("");

				if( txt.indexOf("(Kategorie)")!=-1 || nummin==0) 
				{
					arrcount[0]++;
					arrcount[1]=0;
					resarr[arrcount[0]] = new Array();
					txt = txt.replace("(Kategorie)","");
					nummin=0;
					bid="";
				}
				else 
				{
					if( txt.indexOf("Internes Forum")!=-1) bid=19; //bugfix
					else bid = $("a",this).attr("href").between("&boardID=","'");
				}

				resarr[arrcount[0]][arrcount[1]] = [txt,bid,nummin];
				arrcount[1]++;
			});

			openpop("Thema verschieben",'<input type="text" id="searchboard" style="width:100%;" placeholder="Forenname bzw. Teile"><div id="searchres" style="margin-top:10px;"></div><br><input type="checkbox" id="addkom"> Verlinkung erstellen<br><input type="checkbox" id="addkom2"> Benutzer benachrichtigen <input type="submit" id="del_sub" value="Verschieben" style="float:right;">',1);
			if( GM_getValue("goalert_move",1)==1 ) $("#addkom2").attr("checked",true);
			$("#addkom").attr("checked",true);
			$("#searchboard").focus();
			$("#searchboard").keypress(function(e) {
				var term = $(this).val().toLowerCase();
				if(term.length<=2) return $("#searchres").html("");
			
				if( e.which == 13 && !e.shiftKey ) return $("#del_sub").click();
				
				$("#searchres").html("Suchergebnisse:<br><br>");
				
				$.each(resarr,function(key,val) {
					if( val == undefined || val[0] == undefined) return 1;
					
					$.each(val,function(key2,val2) {
						if( key2 == 0) return 1; //kategorien darf man nich
						var tsearch = val2[0].toLowerCase();

						if( tsearch.indexOf(term)!=-1)
						{
							calcocc=val2[2]-2;
							calccat=0;
							
							var lastresu="",catresu="";
							$.each(val,function(tk,tv) {
								if( tk >= key2) return false;

								if(tv[2] == calccat) catresu = tv[0].split("--").join("");
								if(tv[2] == calcocc) lastresu = tv[0].split("--").join("");
							});
							if( lastresu != "") lastresu = lastresu + " &raquo; ";
							$("#searchres").append('<input type="radio" name="movetoboard" value="'+val2[1]+'" dispval="'+escape(catresu+" - "+lastresu.replace(" &raquo; "," - ")+val2[0])+'"> '+catresu+' &raquo; '+lastresu+val2[0]+'<br>');
						}
					});
				});
				$('input[name=movetoboard]:first').attr("checked",true); 
			});

			$("#del_sub").click(function() {
				if( $("#addkom").is(':checked')) linkit=1;
				else linkit=0;
				
				if( $("#addkom2").is(':checked')) 
				{
					getstarter(turl, function(starter_info) {
						var movetodisp = unescape($('input[name=movetoboard]:checked').attr("dispval"));
						var sendtemplate = filltemplate(GM_getValue("alert_moving_template",""), new Array(starter_info[1],turl,movetodisp));
						sendpn(starter_info[1],"Dein Thema wurde verschoben",sendtemplate);
					});
				}
				
				var movetoboard = $('input[name=movetoboard]:checked').val();
				disablePopup();
				GM_xmlhttpRequest({
					method: "GET",
					url: prot+"://forum.sa-mp.de/index.php?action=ThreadMove&threadID="+tid+"&boardID="+movetoboard+"&withlink="+linkit
				});
				removedisplay(pid);
			});
		}
	});
}

function addkommi(uid,kommi,func)
{
	kommi = encodeURIComponent(kommi);
	GM_xmlhttpRequest({
		method:"GET",
		url:"http://absolut-fair.com/sampde_admin/userinfo.php?action=insert&uid="+uid+"&s="+secid+"&kommentar="+kommi+"&token="+GM_getValue("schnellmod_token","0"),
		onload: function(data) {
			data=data.responseText;
			if(data!="1") return alert("Fehler!\n\n"+data);

			if(func!=undefined) func(); 
		}
	});
	return 1;
}

function getnowstamp()
{
	return (new Date().getTime());
}

function timetoint(thisdate)
{
	if( typeof thisdate == "undefined" || !thisdate || !thisdate.length ) return "1337";
	
	if( thisdate.indexOf("Heute") != -1 || thisdate.indexOf("Gestern") != -1)
	{
		var today = new Date();
		if(thisdate.indexOf("Gestern") != -1) today.setDate(today.getDate() - 1);
		var dd = today.getDate();
		var mm = today.getMonth()+1; //January is 0!
		var yyyy = today.getFullYear();
		thisdate = thisdate.replace("Heute",dd+"."+mm+"."+yyyy).replace("Gestern",dd+"."+mm+"."+yyyy);
	}
	
	thisdate = thisdate.split(",");
	thisdate = thisdate[0].split(".");
	thisdate = new Date(thisdate[2],thisdate[1],thisdate[0]).getTime();
	
	return thisdate;
}

function loop_projektsperre(func)
{
	var sperrinfos = GM_getValue("projektsperrinfos","");
	if(sperrinfos.length)
	{
		$.each(jQuery.parseJSON(sperrinfos), function(a,b) {
			func(b.name,b.entryuser,b.eingetragen);
		});
	}
}

function settings(deftab)
{
	if(deftab == undefined) deftab=0;
	openpop("BF-Meldungen - Einstellungen",'\
	<table style="width:100%; height:25px; color:black; text-align:center; margin-bottom:15px; border-bottom:1px solid grey;" id="modcats">\
		<tr>\
			<td style="border-right:1px solid grey; cursor:pointer;">Allgemein</td>\
			<td style="border-right:1px solid grey; cursor:pointer;">Fortgeschritten</td>\
			<td style="border-right:1px solid grey; cursor:pointer;">Templates</td>\
			<td style="cursor:pointer;">Projektsperren</td>\
		</tr>\
	</table>\
	<div id="modset">\
		<div class="modsettcat cat_Allgemein">\
			<input type="checkbox" id="goindex"> Zusammenfassung auf Startseite<br>\
			<input type="checkbox" id="gounlock"> -- Freizuschaltende Themen<br>\
			<input type="checkbox" id="goreported"> -- Gemeldete Beiträge<br>\
			<input type="checkbox" id="goposts"> Mod.-Funktionen in Beiträgen<br>\
			<br>\
			<input type="checkbox" id="checkprojektsperre"> Projektsperren prüfen<br>\
			<input type="checkbox" id="checkticket"> Ticket-System im Forum verlinken<br>\
			<input type="checkbox" id="go_tickethelper"> Hilfen im Ticketsystem bereitstellen<br>\
			<br>\
			<input type="checkbox" id="hidemod"> Moderationsanzeige verstecken<br>\
			<input type="checkbox" id="hideseg"> Gruppenleitung verstecken<br>\
			<input type="checkbox" id="showupdate"> Update-Benachrichtigung aktivieren<br>\
			<input type="checkbox" id="update_reset_templates"> Bei Update die Templates zurücksetzen<br>\
		</div>\
		<div class="modsettcat cat_Fortgeschritten">\
			Beitragsautor benachrichtigen bei ...<br>\
			<input type="checkbox" id="goalert_move"> Themenverschiebung<br>\
			<input type="checkbox" id="goalert"> Beitragslöschung<br>\
			<input type="checkbox" id="goalert_edit"> Beitragsbearbeitung<br>\
			<br>\
			<input type="checkbox" id="goalert_reporter"> Meldungs - Feedback versenden<br>\
			<input type="checkbox" id="defmodbook"> Beim Löschen von Beiträgen immer Modbucheinträge aktivieren<br>\
			<input type="checkbox" id="goshowbook"> Moderationsbuch in Beiträgen anzeigen<br>\
			<br>\
			<input type="checkbox" id="goraster"> Detaillierte Verwarnungen nutzen<br>\
			<input type="checkbox" id="goinhibitor"> Inhibitor aktivieren<br>\
			<input type="checkbox" id="gosegration"> <span id="seginfo">Segregation von Benutzern im Profil anzeigen</span><br>\
			<br>\
		</div>\
		<div class="modsettcat cat_Templates">\
			<input type="button" id="alert_reporter_feedback" value="Meldungsfeedback"><br>\
			<input type="button" id="delete_template" value="Beitragslöschung"><br>\
			<input type="button" id="alert_edit" value="Beitragsbearbeitung"><br>\
			<input type="button" id="alert_moving_template" value="Verschieben von Themen"><br>\
			<input type="button" id="advanced_warn_template" value="Detaillierte Verwarnungen"><br>\
			<input type="button" id="unlock_deny_template" value="Abgelehnte Freischaltung"><br>\
			<input type="button" id="ip_trace_template" value="IP-Dienst"><br>\
			<br>\
			Nachrichtenvorlagen<br>\
			<hr>\
			<input type="button" id="custom_vorlage_pm_1" value="1"> <input type="button" id="custom_vorlage_pm_2" value="2"> \
			<input type="button" id="custom_vorlage_pm_3" value="3"> <input type="button" id="custom_vorlage_pm_4" value="4"> \
			<input type="button" id="custom_vorlage_pm_5" value="5"> <input type="button" id="custom_vorlage_pm_6" value="6"> \
			<br>\
		</div>\
		<div class="modsettcat cat_Projektsperren">\
			<input type="text" id="projektsperre_add_txt" placeholder="Name des Projektes..." style="width:85%;"> \
			<input type="button" id="projektsperre_add" value="+" style="width:10%;"><br><br>\
			<div style="height:200px; overflow:scroll; overflow-x:hidden; overflow-y:scroll;"><table style="width:100%;" id="projektsperre_liste"></table></div><br>\
			<input type="button" id="projektsperre_reload" value="Aktualisieren" style="float:left;">\
		</div>\
		<input type="button" id="usesetting" value="Anwenden" style="float:right;">\
	</div>',1);
	
	$("#modcats").find("td").hover(function() { $(this).css({"background":"#FAF1AF"}); }, function() { $(this).css({"background":"white"}); });
	$("#modcats").find("td").click(function() { $(".modsettcat").css("display","none"); $(".cat_" + $(this).text()).css("display",""); });
	$(".modsettcat").each(function(i) { if( i!=deftab ) $(this).css("display","none"); });
	
	$("#usesetting").click(function() { location.reload(); });
	$("#modset").find("input[type=checkbox]").each(function() { //checkboxes
		if( $(this).attr("disabled") == "disabled" ) return true;
		$(this).change(function() { 
			if( $(this).is(':checked') ) var chkd=1;
			else var chkd=0;
			GM_setValue($(this).attr("id"),chkd); 
		});
		if( GM_getValue($(this).attr("id"),"1")==1 ) $(this).attr("checked",true);
	});
	
	$(".cat_Templates").find("input[type=button]").click(function() { //templates
		var thistempl = $(this).attr("id");
		
		openpop( $(this).val(), '<textarea id="templedit" style="width:400px; height:325px;">'+GM_getValue(thistempl,"")+'</textarea><BR><input type="button" id="savetempl" value="Speichern"><input type="button" id="resettempl" value="Reset">',1);
		$("#savetempl").click(function() { 
			GM_setValue( thistempl, $("#templedit").val() );
			settings(2); 
		});
		$("#resettempl").click(function() {
			GM_setValue( thistempl, "" );
			deftemplates();
			settings(2); 
		});
	});
	
	$(".cat_Allgemein, .cat_Fortgeschritten").find("input[type=text]").each(function() { //inputs
		$(this).val( GM_getValue($(this).attr("id"), defval[$(this).attr("id")] ) );
		$(this).change(function() { 
			GM_setValue($(this).attr("id"),$(this).val()); 
		});
	});
	
	if($("#userMenuGroupManagement").length==0)
	{
		$("#gosegration").attr({"checked":false,"disabled":true});
		$("#seginfo").html('Segration Benutzern im Profil anzeigen<br>Dir fehlen die nötigen Rechte! Lass sie dir von <a href="'+prot+'://forum.sa-mp.de/index.php?page=User&userID=6393">TuX</a> geben!<br>');
	}

	//projektsperren
	var sperrinfos = GM_getValue("projektsperrinfos","");
	if(sperrinfos.length)
	{
		$.each(jQuery.parseJSON(sperrinfos), function(a,b) {
			var ins_del = "";
			if(b.entryuserid == getbfid()) ins_del='<a href="javascript:void(0);" class="delprojektsperre"><img src="http://icons.iconarchive.com/icons/saki/snowish/16/Button-no-icon.png"></a>';
			$("#projektsperre_liste").append('\
			<tr data-sperrid="'+b.id+'">\
				<td style="text-align:center; font-weight:bold;">'+b.name+'</td>\
				<td style="text-align:center;"><a href="http://forum.sa-mp.de/index.php?page=User&userID='+b.entryuserid+'">'+b.entryuser+'</a></td>\
				<td style="text-align:center;">'+b.eingetragen+'</td>\
				<td style="text-align:center;">'+ins_del+'</td>\
			</tr>');
		});
	}
	else $("#projektsperre_liste").html('<tr><td>Keine Daten vorhanden - aktualisieren?</td></tr>');
	
	$("#projektsperre_add").click(function() {
		var that=this;
		$(this).attr("disabled","disabled");
		var addval = $("#projektsperre_add_txt").val();
		if(!addval.length) return alert("Du musst einen Projektnamen eingeben");
		
		GM_xmlhttpRequest({
			method: "GET",
			url: "https://absolut-fair.com/sampde_admin/projektsperre.php?s="+secid+"&action=add&alias="+encodeURIComponent(addval)+"&token="+GM_getValue("schnellmod_token","0"), 
			onload: function() { 
				refresh_sperren(0,function() { 
					alert("Eintrag hinzugefuegt und lokale Kopie aktualisiert"); 
					$(that).removeAttr("disabled");
					$("#projektsperre_add_txt").val("");					
				}); 
			}
		});
	});
	$("#projektsperre_reload").click(function() {
		$(this).attr("disabled","disabled");
		refresh_sperren(0,function() { settings(3); }); 
	});
	$(".delprojektsperre").click(function() {
		$(this).css("opacity","0.3");
		var that = this;
		var rem_id = $(this).closest("tr").attr("data-sperrid");
		GM_xmlhttpRequest({
			method: "GET",
			url: "https://absolut-fair.com/sampde_admin/projektsperre.php?s="+secid+"&action=remove&id="+rem_id+"&token="+GM_getValue("schnellmod_token","0"), 
			onload: function() { refresh_sperren(0,function() { alert("Eintrag entfernt und lokale Kopie aktualisiert"); $(that).closest("tr").remove(); }); }
		});
	});
}

function reportdelete(rea,ziel,turl,pid,uid,addkom)
{ 
	GM_xmlhttpRequest({
		method: "GET",
		url: prot+"://forum.sa-mp.de/index.php?form=PostEdit&postID="+pid,
		onload: function(data) {
			data=data.responseText;
			var content = escape($(data).find("#text").val());
			
			var reas = filltemplate( GM_getValue("delete_template",""), new Array(ziel,turl,unescape(content),rea) );

			sendpn(ziel,"Einer deiner Beiträge wurde gelöscht",reas);
			if(addkom=="1") addkommi(uid,'Mündliche Verwarnung: '+rea);
		}
	});
}

function gostrike(uid,pid,turli)
{
	$.get(prot+"://forum.sa-mp.de/index.php?form=UserWarn&userID="+uid,function(data) {
		var vws="";
		$(data).find(".formOptionsLong").find("li").each(function(i) {
			prephtml=$(this).text();

			var points=prephtml.between("(Punkte: ",",");
			var title=("]"+prephtml).between("] "," (");
			var mon=prephtml.between("Ablauf: "," Monat");
			var days=prephtml.between("Ablauf: "," Tag");
			days=days.replace(mon,"").replace(" Monat","").replace("e","").replace(",","").replace(" ","");
			
			vws=vws+"<input type='radio' name='reas' points='"+points+"' tite='"+title+"' mon='"+mon+"' days='"+days+"'>"+$(this).text()+"<br>";
		});
		openpop("Verwarnen",vws+"<br><a href='"+prot+"://forum.sa-mp.de/index.php?form=UserWarn&userID="+uid+"&objectType=post&objectID="+pid+"'>Verwarnung manuell vergeben</a><br><br><h3>Zusatzinformationen:</h3><textarea id='addinf'></textarea><br><input type='button' id='substrike' value='Absenden'>",1);
		$('#substrike').click(function() {
			var chosen = $('input[name="reas"]:checked');
			var tit=chosen.attr("tite");
			var po=chosen.attr("points");
			var mo=chosen.attr("mon");
			var da=chosen.attr("days");
			var rea=$("#addinf").val();
			
			mo = parseInt(mo)*4;
			
			if( GM_getValue("goraster","0")==1) 
			{
				var rea = filltemplate( GM_getValue("advanced_warn_template",""), new Array(turli,tit,rea,uid) );
			}
			disablePopup();
			$.post(prot+"://forum.sa-mp.de/index.php?form=UserWarn",{warningID:0,title:tit,points:po,expiresWeek:mo,expiresDay:da,expiresHour:0,reason:rea,userID:uid,objectID:pid,objectType:"post"});
		});
	});
	
}

function getnthhit(string,needle,hit)
{
	var lasthit = 0;
	for(var i=0;i<string.length;i++)
	{
		lasthit = string.indexOf(needle,lasthit+1);
		hit --;
		if(hit == 0) return lasthit;
	}
	return -1;
}

function jumptomeld(id)
{
	$("#gm_atmpos").text(id);
	switchnextmeld();
}

function switchnextmeld() 
{
	$(".repautor","#gm_list").text(getinfo("autor")).attr("href",getinfo("autor_url"));
	if( getinfo("isunlock") )
	{
		$("#meldpanel").css("display","none");
		$("#unlockpanel").css("display","");
	}
	else
	{
		$("#meldpanel").css("display","");
		$("#unlockpanel").css("display","none");
		$("#repmelder","#gm_list").text(getinfo("reportby")).attr("href",getinfo("reportby_url"));
		if( getinfo("reporttxt").length>30) var prev=getinfo("reporttxt").substr(0,30)+" [...]";
		else var prev=getinfo("reporttxt");
		$("#repmeldtxt","#gm_list").text(prev).attr("title",getinfo("reporttxt"));
	}
	
    $("#iframe_loader").show();
    $("iframe","#repbody").hide();
    var plainurl = getinfo("thema_url");

    GM_xmlhttpRequest({
		method: "GET",
		url: plainurl,
		onload: function(data) {
            data=data.responseText;
            var page = $(data).find(".pageNavigation").length ? "-"+($(data).find(".active:first > span",".pageNavigation:first").text()) : "";
            
            var posthash = getinfo("pid");
            var targurl = plainurl.replace("/#post", page+"#inframe").replace("p"+getinfo("pid"),getinfo("tid"));
            
            $("iframe","#repbody").attr("src",targurl).unbind("load").bind("load",function() { 
                setTimeout(function() { 
                    $("#iframe_loader").hide(); 
                    $("iframe","#repbody").show(); 
                    
                    var $contents = $("iframe","#repbody").contents();
                    var toppi = $($contents).find("#post"+posthash).offset().top;
                    $contents.find('html,body').animate({scrollTop:toppi+"px"},10);
                },500); 
            });
        }
    });
	
	$("#repsek_prefix").text(getinfo("prefix"));
	$("#repsek_forum").text(getinfo("forum"));
	$("#repsek_thema").text(getinfo("thema")).attr("href",getinfo("thema_url"));
}

function removedisplay(pid,realremove)
{
	realremove = (typeof realremove == "undefined") ? 1 : realremove;
	if(pagetype==1)
	{
		$('.gm_id_'+pid).fadeOut();
		var atmpos = parseInt($("#gm_atmpos").text())+1;
		$("#gm_atmpos").text(atmpos);
		
		hits-=1;
		if(hits<=0) $("#gm_list").fadeOut();
		else switchnextmeld();

		if(realremove) meldungweg(pid);
	}
	if(pagetype==2)
	{
		$("#postRow"+pid).addClass("deleted");
		if(realremove) meldungweg(pid);
	}
}

function sendpn(ziel,titel,inhalt,func) //ziel ist name als string
{
	inhalt = behilfsumlaute(inhalt);
	$.get(prot+"://forum.sa-mp.de/index.php?form=PMNew",function(data) {
		var idh = $(data).find('input[name="idHash"]').val();
		$.post(prot+"://forum.sa-mp.de/index.php?form=PMNew",{recipients:ziel,blindCopies:"",subject:titel,text:inhalt,parseURL:1,showSignature:1,enableSmilies:1,enableBBCodes:1,activeTab:"smilies",send:"Absenden",pmID:0,forwarding:0,reply:0,replyToAll:0,idHash:idh},function(data) {
			if(func!=undefined) func();
		});
	});
}

function unlocktopic(decision,pid,usr,titel,tid,url)
{
	if(decision) 
	{
		url2=prot+"://forum.sa-mp.de/index.php?page=PostAction&action=enable&postID="+pid+"&t="+secid;
		GM_xmlhttpRequest({
			method: "GET",
			url: url2
		});
		removedisplay(pid);
		return 1;
	}

	GM_xmlhttpRequest({
		method: "GET",
		url: url,
		onload: function(resp) {
			var conti=resp.responseText;
			var tempid = $(conti).find(".threadStarterPost").attr("id");

			if( "postRow"+pid == tempid) var isstarter=1;
			else var isstarter=0;

			GM_xmlhttpRequest({
				method: "GET",
				url: prot+"://forum.sa-mp.de/index.php?form=PostEdit&postID="+pid,
				onload: function(data) {
					data=data.responseText;
					var content = escape($(data).find("#text").val());
					
					var url2 = prot+"://forum.sa-mp.de/index.php?page=PostAction&action=trash&postID="+pid+"&reason=&t="+secid;
					openpop("Begruendung",'<textarea id="declinereason" style="height:300px;" placeholder="Gib eine Begründung für die Ablehnung ein"></textarea><br><input type="submit" value="Absenden" id="sendreasonpn" style="float:right;">',1);
					$("#sendreasonpn").click(function() { 
						disablePopup(); 
						if($("#declinereason").val().length == 0) return;
						var rea = filltemplate( GM_getValue("unlock_deny_template",""), new Array($("#declinereason").val(),unescape(content)) );
						sendpn(usr,"Abgelehnte Freischaltung: "+titel,rea); 
					});

					GM_xmlhttpRequest({
						method: "GET",
						url: url2,
						onload: function() {
							removedisplay(pid);

							if(isstarter) 
							{
								GM_xmlhttpRequest({
									method: "GET",
									url: prot+"://forum.sa-mp.de/index.php?action=ThreadMove&threadID="+tid+"&boardID=105&withlink=0&t="+secid
								});
							}
						}
					});
				}
			});
		}
	});
}

function themaweg(pid,tid)
{
	GM_xmlhttpRequest({
		method: "GET",
		url: prot+"://forum.sa-mp.de/index.php?page=ThreadAction&action=trash&threadID="+tid+"&reason=&t="+secid,
		onload: function() {
			GM_xmlhttpRequest({
				method: "GET",
				url: prot+"://forum.sa-mp.de/index.php?action=ThreadMove&threadID="+tid+"&boardID=105&withlink=0"
			});
		}
	});
}

function meldungweg(pid)
{
	GM_xmlhttpRequest({
		method: "GET",
		url: prot+"://forum.sa-mp.de/index.php?page=PostAction&action=removeReport&postID="+pid+"&t="+secid
	});
}

function beitragweg(pid,needreas,reas)
{
	if(needreas!=0) 
	{
		var reas = prompt("Grund ?", "");
		if(reas==null) return 0;
	}
	else 
	{
		if(reas==undefined) var reas="";
	}
	reas = behilfsumlaute(reas);

	GM_xmlhttpRequest({
		method: "GET",
		url: prot+"://forum.sa-mp.de/index.php?page=PostAction&action=trash&postID="+pid+"&reason="+escape(reas)+"&t="+secid
	});
}

function behilfsumlaute(reas) 
{
	var umlaute = ["ä","ö","ß","ü"];
	var ungeilumlaut = ["ae","oe","ss","ue"];
	
	var newreas = reas;
	$.each(umlaute,function(key,val) {
		newreas = newreas.split(val).join(ungeilumlaut[key]);
	});

	return newreas;
}

function addlist(howmany) 
{
	if( $("#gm_list").length ) 
	{
		$("#gm_hits").text(parseInt($("#gm_hits").text())+howmany);
		return false;
	}
	$(".top5box").before('\
			<div class="info" id="gm_list">\
				<div style="width:98%">\
					<div id="reptopbar">\
						<p style="float:right;">Meldung <span id="gm_atmpos">1</span>/<span id="gm_hits">'+howmany+'</span> <a style="text-decoration:none; color: rgb(0, 102, 255);" status="1" id="repexpinfo" href="#" onclick="return false;">&#9660;</a></p>\
						<p id="regexpcont" style="text-align:right; float:right; margin-right:-85px; margin-top:10px;"></p>\
						<p><span id="repsek_forum"></span> > <b id="repsek_prefix"></b> <a href="#" id="repsek_thema" style="text-decoration:none; color: rgb(0, 102, 255);"></a></p>\
					</div>\
					<div style="margin-bottom:5px; margin-top:5px;" id="repbody">\
						<div id="iframe_loader" style="text-align:center; display:none; margin-bottom:25px; margin-top:25px;"><img src="http://absolut-fair.com/wbb_back/loading2.gif"><br><br>Beitrag wird geladen...</div>\
						<iframe src="about:blank" style="width:100%; height:300px;">iframes sind deaktiviert</iframe>\
					</div>\
					<div id="repbottombar">\
						<div id="meldpanel">\
							<p style="float:right;">"<a id="repmeldtxt" style="text-decoration:none; color: rgb(0, 102, 255);" href="#" onclick="return false;"></a>" laut <a id="repmelder" href="#" style="text-decoration:none; color: rgb(0, 102, 255);"></a></p>\
							<p>Beitrag von <a class="repautor" href="#" style="text-decoration:none; color: rgb(0, 102, 255);"></a></p>\
							<div style="margin:0 auto; width:350px; margin-top:-20px;" class="action modaction">\
								<a href="#" style="margin-right:25px;" onclick="return false;" title="Vorherige Meldung" class="previous"><img src="http://icons.iconarchive.com/icons/icojam/blue-bits/16/arrow-left-icon.png" width="16"></a>\
								<a href="#" onclick="return false;" title="Meldung entfernen" class="flush" ><img src="wcf/icon/pmTrashEmptyM.png" width="16"></a>\
								<a href="#" onclick="return false;" title="Verwarnen" class="strike"><img src="wcf/icon/infractionWarningM.png" width="16"></a>\
								<a href="#" onclick="return false;" title="Beitrag löschen" class="remove"><img src="http://icons.iconarchive.com/icons/saki/snowish/16/Button-no-icon.png"  width="16"></a>\
								<a href="#" onclick="return false;" title="Beitrag verwarnen und löschen" class="removestrike"><img src="http://icons.iconarchive.com/icons/custom-icon-design/pretty-office-3/16/Male-User-Warning-icon.png"  width="16"></a>\
								<a href="#" onclick="return false;" title="Thema entfernen" class="removetop"><img src="http://icons.iconarchive.com/icons/tatice/just-bins/16/bin-blue-full-icon.png"></a>\
								<a href="#" onclick="return false;" title="Thema verwarnen und löschen" class="striketop"><img src="http://icons.iconarchive.com/icons/tatice/just-bins/16/bin-red-icon.png"  width="16"></a>\
								<a href="#" onclick="return false;" title="Thema verschieben" class="movetop"><img src="wcf/icon/messageQuickReplyM.png" style="width:16px; height:16px;" title="Verschieben"></a>\
								<a href="#" onclick="return false;" title="Benutzer sperren" class="banit"><img src="wcf/icon/bannedS.png" width="16"></a>\
								<a href="#" onclick="return false;" title="Meldung zur&uuml;ckweisen" class="reject"><img src="wcf/icon/legalNoticeS.png" width="16"></a>\
								<a href="#" onclick="return false;" title="Meldung f&uuml;r mich verstecken" class="hide"><img src="https://cdn2.iconfinder.com/data/icons/snipicons/500/eye-close-16.png" width="16"></a>\
								<a href="#" style="margin-left:25px;"onclick="return false;" title="N&auml;chste Meldung" class="next"><img src="http://icons.iconarchive.com/icons/icojam/blue-bits/16/arrow-right-icon.png" width="16"></a>\
							</div>\
						</div>\
						<div id="unlockpanel">\
							<p style="float:right;">\
								<a href="#" style="margin-right:5px;" onclick="return false;" title="Vorherige Meldung" class="previous"><img src="http://icons.iconarchive.com/icons/icojam/blue-bits/16/arrow-left-icon.png" width="16"></a>\
								<a href="#" onclick="return false;" title="Annehmen" class="unlock_accept"><img src="http://icons.iconarchive.com/icons/custom-icon-design/pretty-office-8/16/Accept-icon.png" width="16"></a>\
								<a href="#" onclick="return false;" title="Ablehnen" class="unlock_remove"><img src="http://icons.iconarchive.com/icons/saki/snowish/16/Button-no-icon.png" width="16"></a>\
								<a href="#" style="margin-left:5px;" onclick="return false;" title="N&auml;chste Meldung" class="next"><img src="http://icons.iconarchive.com/icons/icojam/blue-bits/16/arrow-right-icon.png" width="16"></a>\
							</p>\
							<p>Beitrag von <a class="repautor" href="#" style="text-decoration:none; color: rgb(0, 102, 255);"></a></p>\
						</div>\
					</div>\
				</div>\
			</div>\
			<div id="secret_info" style="display:none;"></div>'); 
			
	$("#repmeldtxt").click(function() {
		openpop("Meldung betrachten",'<textarea style="width:400px; height:325px;">'+($(this).attr("title") || $(this).attr("data-original-title"))+'</textarea>',1);
	});
}

function getinfo(str)
{ 
	switch(pagetype)
	{
		case 1:
			var mypos=parseInt($("#gm_atmpos").text())-1;
			var target=$(".indexhit:eq("+mypos+")","#secret_info").find("."+str);
			break;
		case 2:
			var target=$(".secinfo","#"+lastid).find("."+str);
			break;
	}
	if(!target.length) return "";
	else return target.text();
}

function addunlock(howmany)
{
	$(".top5box").before('\
					<div class="info" id="gm_unlock">\
				<p><span id="gm_hits2">'+howmany+'</span> Themen warten auf Freischaltung:</p>\
				<ul class="gm_unlock">\
									</ul>\
			</div>');
}


//#############################################################################################
//					Funktionen von andren Leuten (wenn auch editiert)...
//#############################################################################################
String.prototype.between = function(prefix, suffix) {
s = this;
var i = s.indexOf(prefix);
if (i >= 0) {
s = s.substring(i + prefix.length);
}
else {
return '';
}
if (suffix) {
i = s.indexOf(suffix);
if (i >= 0) {
s = s.substring(0, i);
}
else {
return '';
}
}
return s;
}

function openpop(titel,text,ishtml)
{
	$("#popupContact > h1").html(titel);
	if(ishtml) $("#contactArea").html(text);
	else $("#contactArea").text(text);
	$("img","#contactArea").attr({src:"",alt:"Bild"});
	centerPopup();
	loadPopup(); 
	
	$("#contactArea").find("textarea").focus().keypress(function (e) {
		if (e.which == 13 && !e.shiftKey) {
			$("#contactArea").find('input[type="submit"]').click();
		}
	});
}

function initpop()
{	
	GM_addStyle("#backgroundPopup{  \
display:none;  \
position:fixed;  \
_position:absolute;   \
height:500%;  \
width:500%;  \
top:-15px;  \
left:-15px;  \
background:#000000;  \
border:1px solid #cecece;  \
z-index:98;  \
}  \
#popupContact{  \
display:none;  \
position:fixed;  \
_position:fixed;   \
min-width:408px;  \
max-width:80%; \
max-height:80%; \
background:#FFFFFF;  \
border:2px solid #cecece;  \
z-index:99;  \
padding:12px;  \
font-size:13px;  \
}  \
#popupContact h1{  \
text-align:left;  \
color:#6FA5FD;  \
font-size:22px;  \
font-weight:700;  \
border-bottom:1px dotted #D3D3D3;  \
padding-bottom:2px;  \
margin-bottom:20px;  \
}  \
#popupContactClose{  \
font-size:14px;  \
line-height:14px;  \
right:6px;  \
top:4px;  \
position:absolute;  \
color:#6fa5fd;  \
font-weight:700;  \
display:block;  \
}  \
");

	$("body").before(''+
	'<div id="popupContact">  '+
    '    <a id="popupContactClose">x</a> '+ 
    '    <h1></h1>  '+
    '    <p id="contactArea">  '+
    '    </p>  '+
    '</div> '+
	'<div id="backgroundPopup"></div>');
	
	$("#popupContactClose").click(function() {  
		disablePopup();  
	});  
	
	$("#backgroundPopup").click(function() {  
		disablePopup();  
	});  
	
	$(document).keypress(function(e) {  
		if(e.keyCode==27 && popupStatus==1)
		{  
			disablePopup();  
		}  
	});
}

function loadPopup()
{  
	if(popupStatus==0)
	{  
		$("#backgroundPopup").css({  
		"opacity": "0.7"  
		});  
		$("#backgroundPopup").fadeIn("fast");  
		$("#popupContact").fadeIn("fast");  
		popupStatus = 1;  
	}  
}  

function disablePopup(){   
if(popupStatus==1){  
$("#backgroundPopup").fadeOut("fast");  
$("#popupContact").fadeOut("fast");  
popupStatus = 0;  
}  
}  

function centerPopup(){
var windowWidth = document.documentElement.clientWidth;
var windowHeight = document.documentElement.clientHeight;
var popupHeight = $("#popupContact").height();
var popupWidth = $("#popupContact").width();
//centering
$("#popupContact").css({
"position": "fixed",
"top": windowHeight/2-popupHeight/2,
"left": windowWidth/2-popupWidth/2
});
}

function occurrences(string, subString, allowOverlapping){

    string+=""; subString+="";
    if(subString.length<=0) return string.length+1;

    var n=0, pos=0;
    var step=(allowOverlapping)?(1):(subString.length);

    while(true){
        pos=string.indexOf(subString,pos);
        if(pos>=0){ n++; pos+=step; } else break;
    }
    return(n);
}


function getQueryParams(qs) {
    qs = qs.split("+").join(" ");
    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])]
            = decodeURIComponent(tokens[2]);
    }

    return params;
}

function need_update(v1, v2) { //ret: 0=equal/1 bigger; 1=2 bigger
	if( $.isArray(v1) ) v1 = v1.splice(0);
	if( $.isArray(v2) ) v2 = v2.splice(0);
    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length == i) {
            return 0;
        }

        if (v1parts[i] == v2parts[i]) {
            continue;
        }
        else if (v1parts[i] > v2parts[i]) {
            return 0;
        }
        else {
            return 1;
        }
    }

    if (v1parts.length != v2parts.length) {
        return 1;
    }

    return 0;
}



/*
function PostTextToUnban(url, user, txt, closeit) 
{
	if(typeof txt == "undefined") return false;
	//console.log("postunban\n"+txt+"\n\n");
	
	var tid = (url + "&").between("&threadID=","&");
	var ansurl = "http://unban.breadfish-rp.de/index.php?form=PostAdd&threadID="+tid;
	
	if(user.length) 
	{
		user=prot+"://forum.sa-mp.de/index.php?page=User&userID="+user;
		user="[url="+user+"]Gefundenenes Benutzerprofil[/url]\n\n";
	}
	txt = filltemplate( GM_getValue("unban_info_header_template",""), new Array(user,txt) );
	
	GM_xmlhttpRequest({
		method: "GET",
		url: ansurl,
		onload: function(data) {
			data=data.responseText;
			var idhash = $(data).find("#idHash").val();
			var senddata = 'subject=&text='+encodeURIComponent(txt)+'&mce_editor_0_fontNameSelect=&mce_editor_0_fontSizeSelect=0&wysiwygEditorHeight=200&wysiwygEditorMode=0&parseURL=1&enableSmilies=1&enableBBCodes=1&activeTab=smilies&send=Absenden&postID=0&idHash='+idhash;
			
			if( $(data).find("#textDiv").length )
			{
				GM_xmlhttpRequest({
					method: "POST",
					headers : { "Content-Type":"application/x-www-form-urlencoded" },
					url: ansurl,
					data: senddata,
					onload: function(data) {
						if(closeit)
						{
							GM_xmlhttpRequest({
								method: "POST",
								url: "http://unban.breadfish-rp.de/index.php",
								data: 'action=ThreadClose&threadID='+tid+'&x=13&y=7',
								headers : {
									"Content-Type":"application/x-www-form-urlencoded"
								}
							});
						}
					}
				});
			}
			else console.log("unban-error: not logged in?!");
		}
	});

	GM_setValue("paste_info", txt);
	GM_setValue("paste_info_close", closeit);
	//GM_openInTab( ansurl );
	$("body").prepend('<iframe src="'+ansurl+'" style="width:1px; height:1px; position:absolute; left:-2000px;"></iframe>');

	return true;
}
*/


/*
function getbaninfo(usernm, callb)
{
	GM_xmlhttpRequest({
		method: "POST",
		url: prot+"://forum.sa-mp.de/index.php?form=MembersSearch",
		data: 'staticParameters[username]='+escape(usernm)+'&matchExactly[username]=1',
		headers : {
			"Referrer" : prot+"://forum.sa-mp.de/index.php?form=MembersSearch",
			"Content-Type":"application/x-www-form-urlencoded"
		},
		onload: function(newdata) {
			newdata = newdata.responseText;

			var uid = $(newdata).find(".containerContentSmall:first > p > a").attr("href") + "&";
			uid = uid.between("userID=","&");
			//console.log("early-uid:"+uid);
			
			if( uid.length <= 1) return callb("Dein Benutzername hier konnte im Hauptforum nicht gefunden werden. Automatische Informationsantraege sind daher nicht moeglich.","",0);

			GM_xmlhttpRequest({
				method: "GET",
				url: prot+"://forum.sa-mp.de/index.php?page=UserWarningOverview&userID="+uid,
				onload: function(newdata2) {
					newdata2 = newdata2.responseText;

					var vwlist = $(newdata2).find(".tableList:first");
					var latestvw,latesttime=0;
					$("tr",vwlist).each(function(i) {
						var thisdate = $(".columnUserWarningTime",this).text();
						thisdate = timetoint(thisdate); 

						if(thisdate > latesttime)
						{
							latesttime = thisdate;
							latestvw = i;
						}
					});
					
					var latestobj = $("tr:eq("+latestvw+")",vwlist);
					var latestjudge = $(".columnUserWarningJudge > a",latestobj).text();
					var latestreas = $(".columnUserWarningTitle > a",latestobj).text();
					var latesttimealias = $(".columnUserWarningTime",latestobj).text();
					var latestpost = $(".columnUserWarningObject > a",latestobj).text();
					var latestpost_href = $(".columnUserWarningObject > a",latestobj).attr("href");
					if( !latestpost.length || !latestpost_href.length) 
					{
						latestpost = "/";
						latestpost_href = "#";
					}
					var latestinfo = filltemplate(GM_getValue("unban_info_warn_template",""), new Array(latestjudge,latestreas,latesttimealias,latestpost_href,latestpost));
					if( latestreas == "" ) latestinfo = "Zu deinen Verwarnungen kann leider keine Information abgerufen werden.";

					var sanklist = $(newdata2).find(".tableList:last");
					var latestsankt="",latesttime=0,latestsanktabl;

					$("tr",sanklist).each(function(i) {
						var that = $("tr:eq("+i+")",sanklist)
						var thissankt = $.trim($(".columnUserSuspensionTitle",that).text());

						if( thissankt && thissankt.length && thissankt.indexOf("Ausschluss") == -1) return true;
						var thisdate = $(".columnUserSuspensionTime",that).text();
						thisdate = timetoint(thisdate);

						if(thisdate > latesttime)
						{
							latesttime = thisdate;
							latestsankt = thissankt;
							latestsanktabl = $(".columnUserSuspensionExpires",that).text();
						}
						if( thisdate == latesttime )
						{
							if( thissankt.indexOf("unbegrenzt") != -1 )
							{
								latesttime = thisdate;
								latestsankt = thissankt;
								latestsanktabl = $(".columnUserSuspensionExpires",that).text();
							} 
						}
					});
					if( timetoint(latestsanktabl) < getnowstamp() ) latestsankt="";
					
					var endtxt;
					var goclose=1;
					if( latestsankt == "" ) 
					{
						GM_xmlhttpRequest({
							method: "GET",
							url: prot+"://forum.sa-mp.de/index.php?page=User&userID="+uid,
							onload:function(newdata3) {
								newdata3 = newdata3.responseText;
						
								var foundother = 0;
								$(newdata3).find("li.formElement").each(function() {
									if( $(".formFieldLabel",this).text() == "Banngrund" )
									{
										foundother=1;
										endtxt = "Dein Account wurde mit folgender Begründung gesperrt: [b]"+($(".formField",this).text())+"[/b]";
										return false;
									}
								});
								
								if(!foundother)	
								{
									endtxt = "Dein Hauptaccount wurde nicht gesperrt. Eine Information ist daher nicht verfuegbar.";
									goclose=0;
								} 
								
								callb(endtxt,uid,goclose);
							}
						});
						return;
					}
					else endtxt = filltemplate( GM_getValue("unban_info_ban_template",""), new Array(latestsankt,latestsanktabl,latestinfo ) );
					
					callb(endtxt,uid,goclose);
				}
			});
		}
	});
}
*/