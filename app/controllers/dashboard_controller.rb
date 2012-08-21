# Author:: Miron Cuperman (mailto:miron+cms@google.com)
# Copyright:: Google Inc. 2011
# License:: Apache 2.0

# Controller for showing a dashboard consisting of BizProcess -> System -> Control
# tree.

class DashboardController < ApplicationController
  include ApplicationHelper
  layout 'application'

  before_filter :load_biz_process, :only => [:openbp,
                                             :closebp]

  before_filter :load_sys, :only => [:opensys, :closesys]


  before_filter :need_cycle

  # Show the collapsed dashboard view, consisting of a (possibly filtered) list of
  # BizProcess objects.
  #
  # We may get a POST here if a filter is changed.
  def index
    if request.post?
      redirect_to url_for
    else
      @biz_processes = filter_biz_processes(BizProcess)
    end
  end

  # AJAX for drilldown into a BizProcess
  def openbp
    render :partial => "dashboard/openbp", :locals => {:bp => @bp}
  end

  # AJAX for closing a BizProcess drilldown
  def closebp
    render :partial => "dashboard/closebp", :locals => {:bp => @bp}
  end

  # AJAX for drilldown into a System
  def opensys
    render :partial => "dashboard/opensys", :locals => {:biz_process => @biz_process, :system => @system}
  end

  # AJAX for closing a System drilldown
  def closesys
    render :partial => "dashboard/closesys", :locals => {:biz_process => @biz_process, :system => @system}
  end

  private
    def load_biz_process
      @bp = BizProcess.find(params[:id])
    end

    def load_sys
      @biz_process = BizProcess.find(params[:biz_process_id])
      @system = System.find(params[:id])
    end
end
